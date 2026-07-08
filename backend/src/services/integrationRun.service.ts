import { workdayConfig } from '../config/workdayConfig';
import { WorkdayService } from './workday.service';
import { AiService } from './ai.service';

export class IntegrationRunService {
  private workdayService = new WorkdayService();
  private aiService = new AiService();

  private getIntervalSinceDate(interval?: string): Date {
    const now = Date.now();
    switch (interval) {
      case '10m':
        return new Date(now - 10 * 60 * 1000);
      case '1h':
        return new Date(now - 60 * 60 * 1000);
      case '5h':
        return new Date(now - 5 * 60 * 60 * 1000);
      case '1d':
      default:
        return new Date(now - 24 * 60 * 60 * 1000);
    }
  }

  async listAll(filters?: { status?: string; integrationId?: string; interval?: string }): Promise<any[]> {
    const since = this.getIntervalSinceDate(filters?.interval);
    
    // Fetch events in real-time from Workday RaaS JSON REST Endpoint
    const reportEntries = await this.workdayService.fetchIntegrationRunsFromRaaS(
      workdayConfig,
      since
    );

    // Map Workday Custom Report JSON entries to frontend fields
    let mapped = reportEntries.map((entry) => {
      const statusValue = entry.Status || 'Completed';
      
      let displayStatus = statusValue;
      if (statusValue.toLowerCase().includes('warning') || statusValue.toLowerCase().includes('error')) {
        displayStatus = 'Completed with Warnings';
      } else if (statusValue.toLowerCase().includes('fail')) {
        displayStatus = 'Failed';
      } else if (statusValue.toLowerCase().includes('process')) {
        displayStatus = 'Processing';
      } else {
        displayStatus = 'Completed';
      }

      // Formatting date: e.g. "07/08/2026 09:47:59 AM"
      const formatDateStr = (dateStr: string | null | undefined) => {
        if (!dateStr) return '—';
        const d = new Date(dateStr);
        return d.toLocaleString('en-US', {
          month: '2-digit',
          day: '2-digit',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
          hour12: true,
        });
      };

      return {
        id: entry.EventID || `EVENT_${Date.now()}`,
        integrationId: entry.Integration_System || 'unknown',
        status: displayStatus,
        runBy: entry.Ran_as_System_User || 'System',
        startedAt: entry.Actual_Completed_Date_and_Time || new Date().toISOString(),
        completedAt: entry.Actual_Completed_Date_and_Time || null,
        completedAtFormatted: formatDateStr(entry.Actual_Completed_Date_and_Time),
        errorMessage: displayStatus === 'Failed' ? (entry.Errors___Warnings || 'Integration Failed') : '',
        errorsWarnings: entry.Errors___Warnings || '',
        integrationEvent: entry.Integration_Event || `${entry.Integration_System} - ${entry.EventID}`,
        integration: {
          id: entry.Integration_System || 'unknown',
          workdaySystemId: entry.Integration_System || 'unknown',
          name: entry.Integration_System || 'Unknown Integration',
        },
      };
    });

    // Filter by integration if requested
    if (filters?.integrationId) {
      mapped = mapped.filter((r) => r.integrationId === filters.integrationId);
    }

    // Filter by status if requested
    if (filters?.status && filters.status !== 'All') {
      const filterStatus = filters.status === 'Completed_With_Errors' ? 'Completed with Warnings' : filters.status;
      mapped = mapped.filter((r) => r.status.toLowerCase() === filterStatus.toLowerCase());
    }

    return mapped;
  }

  async getById(id: string): Promise<any> {
    const event = await this.workdayService.fetchIntegrationEventById(workdayConfig, id);
    if (!event) {
      throw new Error(`Integration run event with ID ${id} not found in Workday.`);
    }

    const displayStatus = event.status === 'Completed_With_Errors' ? 'Completed with Warnings' : event.status;
    
    let errorsWarnings = '';
    let aiAnalysis = null;

    if (event.status === 'Failed' || event.status === 'Completed_With_Errors') {
      const count = event.errorsWarningsCount || 1;
      errorsWarnings = `${count} Errors & Warnings`;

      // Generate Gemini analysis on the fly
      try {
        const diagnosis = await this.aiService.analyzeErrorLogs(
          event.workdaySystemName || 'Unknown Integration',
          event.errorMessage || 'No error message provided',
          event.logs || 'No logs available'
        );
        aiAnalysis = {
          detectedRootCause: diagnosis.detectedRootCause,
          suggestedFix: diagnosis.suggestedFix,
          applied: false,
        };
      } catch (aiErr: any) {
        console.error('[IntegrationRunService] AI Diagnosis failed:', aiErr.message);
      }
    }

    const formatDate = (d: Date | null) => {
      if (!d) return '—';
      return d.toLocaleString('en-US', {
        month: '2-digit',
        day: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: true,
      });
    };

    const initiatedDateStr = formatDate(event.startedAt);

    return {
      id: event.id,
      integrationId: event.workdaySystemId || 'unknown',
      status: displayStatus,
      runBy: event.runBy || 'System',
      startedAt: event.startedAt.toISOString(),
      completedAt: event.completedAt ? event.completedAt.toISOString() : null,
      completedAtFormatted: formatDate(event.completedAt),
      errorMessage: event.errorMessage || '',
      errorsWarnings,
      logs: event.logs || 'No logs attached.',
      aiAnalysis,
      launchParameters: event.launchParameters || [],
      integrationEvent: `${event.workdaySystemName || event.workdaySystemId || 'Unknown'} - ${initiatedDateStr} (${displayStatus})`,
      integration: {
        id: event.workdaySystemId || 'unknown',
        workdaySystemId: event.workdaySystemId || 'unknown',
        name: event.workdaySystemName || 'Unknown Integration',
      },
    };
  }

  async relaunch(
    runId: string,
    customParams?: { name: string; value: string }[]
  ): Promise<{ success: boolean; launchedEventId: string; message: string }> {
    console.log(`[Relaunch] Fetching event ${runId} to resolve its integration system ID and parameters...`);
    const event = await this.workdayService.fetchIntegrationEventById(workdayConfig, runId);
    if (!event || !event.workdaySystemId) {
      throw new Error(`Failed to resolve Workday system ID for event ${runId}.`);
    }

    const paramsToUse = customParams || event.launchParameters || [];

    console.log(`[Relaunch] Triggering real-time relaunch for ${event.workdaySystemName || event.workdaySystemId} (${event.workdaySystemId}) with ${paramsToUse.length} parameter(s)`);
    const newEventId = await this.workdayService.launchIntegration(workdayConfig, event.workdaySystemId, paramsToUse);

    return {
      success: true,
      launchedEventId: newEventId,
      message: `Launch_Integration request successful. Scheduled new Workday process run ${newEventId}.`,
    };
  }

  async pollIntegration(integrationId: string): Promise<{ success: boolean; pulledEventsCount: number; message: string }> {
    // Return mock success since polling is now real-time on page load
    return {
      success: true,
      pulledEventsCount: 0,
      message: 'Integration polling is handled in real-time on page load.',
    };
  }

  async pollAllIntegrations(): Promise<{ success: boolean; pulledEventsCount: number; message: string }> {
    return {
      success: true,
      pulledEventsCount: 0,
      message: 'All integrations polled in real-time on page load.',
    };
  }

  async applyFix(runId: string): Promise<any> {
    // Returns mock AI Analysis with applied = true
    return {
      runId,
      applied: true,
      updatedAt: new Date().toISOString(),
    };
  }
}

