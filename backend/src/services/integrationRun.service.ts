import { IntegrationRunRepository } from '../repositories/integrationRun.repository';
import { IntegrationRepository } from '../repositories/integration.repository';
import { WorkdayConfigRepository } from '../repositories/workdayConfig.repository';
import { AiAnalysisRepository } from '../repositories/aiAnalysis.repository';
import { WorkdayService } from './workday.service';
import { AiService } from './ai.service';
import { IntegrationRun, Integration, AiAnalysis } from '@prisma/client';
import { env } from '../config/env';

export class IntegrationRunService {
  private runRepo = new IntegrationRunRepository();
  private integrationRepo = new IntegrationRepository();
  private configRepo = new WorkdayConfigRepository();
  private aiAnalysisRepo = new AiAnalysisRepository();

  private workdayService = new WorkdayService();
  private aiService = new AiService();

  async listAll(filters?: { status?: string; integrationId?: string }): Promise<any[]> {
    const runs = await this.runRepo.findAll(filters);
    if (!runs || runs.length === 0) {
      throw new Error('No integration runs found in the database. Please trigger a poll first to sync data from Workday.');
    }
    return runs;
  }

  async getById(id: string): Promise<any> {
    const run = await this.runRepo.findById(id);
    if (!run) {
      throw new Error(`Integration run event with ID ${id} not found in the database.`);
    }
    return run;
  }

  async relaunch(runId: string): Promise<{ success: boolean; launchedEventId: string; message: string }> {
    // 1. Fetch the failed run details
    const run = await this.getById(runId);
    if (!run) {
      throw new Error(`Integration run ${runId} not found.`);
    }

    const integrationId = run.integrationId;
    let integrationName = 'Unknown Integration';
    let workdaySystemId = 'UNKNOWN_SYSTEM';

    if (run.integration) {
      integrationName = run.integration.name;
      workdaySystemId = run.integration.workdaySystemId;
    }

    // 2. Fetch the config credentials
    let config = await this.configRepo.getFirst();
    const hasPlaceholder = !config || config.clientId.includes('YOUR_');

    if (hasPlaceholder) {
      // In professional setups, if config does not exist or has placeholders, sync from ENV credentials
      config = await this.configRepo.upsert({
        tenantName: env.WORKDAY_TENANT_NAME || 'Dpt3',
        clientId: env.WORKDAY_CLIENT_ID || 'YOUR_CLIENT_ID',
        clientSecret: env.WORKDAY_CLIENT_SECRET || 'YOUR_CLIENT_SECRET',
        refreshToken: env.WORKDAY_REFRESH_TOKEN || 'YOUR_REFRESH_TOKEN',
        apiEndpoint: env.WORKDAY_API_ENDPOINT || 'https://wd3-impl-services1.workday.com',
      });
    }

    if (!config) {
      throw new Error('Failed to load Workday configuration for relaunch.');
    }

    // 3. Trigger launch
    console.log(`[Relaunch] Triggering manual relaunch for ${integrationName} (${workdaySystemId})`);
    const newEventId = await this.workdayService.launchIntegration(config, workdaySystemId);

    // 4. Save new pending/processing run to DB
    try {
      await this.runRepo.upsert({
        id: newEventId,
        integrationId: integrationId,
        status: 'Processing',
        runBy: 'API_Relaunch_User',
        startedAt: new Date(),
        logs: 'Initiated via Relaunch trigger.',
      });
    } catch (err: any) {
      console.warn('[Relaunch] Could not persist new run to DB:', err.message);
    }

    return {
      success: true,
      launchedEventId: newEventId,
      message: `Launch_Integration request successful. Scheduled new Workday process run ${newEventId}.`,
    };
  }

  async pollIntegration(integrationId: string): Promise<{ success: boolean; pulledEventsCount: number; message: string }> {
    const integration = await this.integrationRepo.findById(integrationId);
    if (!integration) {
      throw new Error(`Integration with ID ${integrationId} does not exist in the database.`);
    }

    let config = await this.configRepo.getFirst();
    const hasPlaceholder = !config || config.clientId.includes('YOUR_');

    if (hasPlaceholder) {
      config = await this.configRepo.upsert({
        tenantName: env.WORKDAY_TENANT_NAME || 'Dpt3',
        clientId: env.WORKDAY_CLIENT_ID || 'YOUR_CLIENT_ID',
        clientSecret: env.WORKDAY_CLIENT_SECRET || 'YOUR_CLIENT_SECRET',
        refreshToken: env.WORKDAY_REFRESH_TOKEN || 'YOUR_REFRESH_TOKEN',
        apiEndpoint: env.WORKDAY_API_ENDPOINT || 'https://wd3-impl-services1.workday.com',
      });
    }

    if (!config) {
      throw new Error('Failed to load Workday configuration for polling.');
    }

    // Default: query last 24 hours of events
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const workdayEvents = await this.workdayService.fetchIntegrationEvents(config, integration.workdaySystemId, since);

    let createdCount = 0;

    for (const wdEvent of workdayEvents) {
      try {
        // Upsert Run record
        await this.runRepo.upsert({
          id: wdEvent.id,
          integrationId: integration.id,
          status: wdEvent.status,
          runBy: wdEvent.runBy,
          startedAt: wdEvent.startedAt,
          completedAt: wdEvent.completedAt,
          logs: wdEvent.logs,
          errorMessage: wdEvent.errorMessage,
        });

        createdCount++;

        // If run is Failed / Completed With Errors and does not have AI Analysis, run Gemini AI diagnosis
        if (wdEvent.status === 'Failed' || wdEvent.status === 'Completed_With_Errors') {
          const hasAi = await this.aiAnalysisRepo.findByRunId(wdEvent.id);
          if (!hasAi) {
            console.log(`[AI Diagnosis] Running analysis for failed event: ${wdEvent.id}`);
            const diagnosis = await this.aiService.analyzeErrorLogs(
              integration.name,
              wdEvent.errorMessage || 'No error message provided',
              wdEvent.logs
            );

            await this.aiAnalysisRepo.createOrUpdate({
              runId: wdEvent.id,
              suggestedFix: diagnosis.suggestedFix,
              detectedRootCause: diagnosis.detectedRootCause,
            });

            // Handle AUTO-RELAUNCH if enabled on this integration
            if (integration.autoLaunch) {
              console.log(`[Auto-Launch] Auto-launch enabled for integration ${integration.name}. Running relaunch trigger...`);
              await this.relaunch(wdEvent.id);
            }
          }
        }
      } catch (err: any) {
        console.warn(`[Poller] Failed processing event ${wdEvent.id} in DB:`, err.message);
      }
    }

    return {
      success: true,
      pulledEventsCount: createdCount || workdayEvents.length,
      message: 'Polled Workday events successfully.',
    };
  }

  async pollAllIntegrations(): Promise<{ success: boolean; pulledEventsCount: number; message: string }> {
    let config = await this.configRepo.getFirst();
    const hasPlaceholder = !config || 
      config.clientId.includes('YOUR_') || 
      config.clientSecret.includes('YOUR_') || 
      config.refreshToken.includes('YOUR_');

    if (hasPlaceholder) {
      config = await this.configRepo.upsert({
        tenantName: env.WORKDAY_TENANT_NAME || 'Dpt3',
        clientId: env.WORKDAY_CLIENT_ID || 'YOUR_CLIENT_ID',
        clientSecret: env.WORKDAY_CLIENT_SECRET || 'YOUR_CLIENT_SECRET',
        refreshToken: env.WORKDAY_REFRESH_TOKEN || 'YOUR_REFRESH_TOKEN',
        apiEndpoint: env.WORKDAY_API_ENDPOINT || 'https://wd3-impl-services1.workday.com',
      });
    }

    if (!config) {
      throw new Error('Failed to load Workday configuration for global polling.');
    }

    // Default: query last 24 hours of events across all integrations (passing undefined for workdaySystemId)
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const workdayEvents = await this.workdayService.fetchIntegrationEvents(config, undefined, since);

    let createdCount = 0;

    for (const wdEvent of workdayEvents) {
      try {
        const sysId = wdEvent.workdaySystemId || 'UNKNOWN_SYSTEM';
        const sysName = wdEvent.workdaySystemName || sysId;

        // 1. Ensure the integration exists in our local database
        let integration = await this.integrationRepo.findBySystemId(sysId);
        if (!integration) {
          integration = await this.integrationRepo.create({
            workdaySystemId: sysId,
            name: sysName,
            description: `Auto-discovered integration from Workday.`,
            category: 'Integrations',
            pollingInterval: '10m',
            autoLaunch: false,
          });
        }

        // 2. Upsert Run record
        await this.runRepo.upsert({
          id: wdEvent.id,
          integrationId: integration.id,
          status: wdEvent.status,
          runBy: wdEvent.runBy,
          startedAt: wdEvent.startedAt,
          completedAt: wdEvent.completedAt,
          logs: wdEvent.logs,
          errorMessage: wdEvent.errorMessage,
        });

        createdCount++;

        // 3. AI diagnosis for failures
        if (wdEvent.status === 'Failed' || wdEvent.status === 'Completed_With_Errors') {
          const hasAi = await this.aiAnalysisRepo.findByRunId(wdEvent.id);
          if (!hasAi) {
            console.log(`[AI Diagnosis] Running analysis for failed event: ${wdEvent.id}`);
            const diagnosis = await this.aiService.analyzeErrorLogs(
              integration.name,
              wdEvent.errorMessage || 'No error message provided',
              wdEvent.logs
            );

            await this.aiAnalysisRepo.createOrUpdate({
              runId: wdEvent.id,
              suggestedFix: diagnosis.suggestedFix,
              detectedRootCause: diagnosis.detectedRootCause,
            });
          }
        }
      } catch (err: any) {
        console.warn(`[Poller] Failed processing event ${wdEvent.id} in DB:`, err.message);
      }
    }

    return {
      success: true,
      pulledEventsCount: createdCount || workdayEvents.length,
      message: `Polled ${workdayEvents.length} global Workday events successfully.`,
    };
  }

  async applyFix(runId: string): Promise<AiAnalysis> {
    const analysis = await this.aiAnalysisRepo.findByRunId(runId);
    if (!analysis) {
      throw new Error(`AI Analysis for run ${runId} not found.`);
    }
    return this.aiAnalysisRepo.setApplied(runId, true);
  }
}

