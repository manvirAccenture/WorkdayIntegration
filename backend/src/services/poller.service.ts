import { IntegrationService } from './integration.service';
import { IntegrationRunService } from './integrationRun.service';

export class PollerService {
  private integrationService = new IntegrationService();
  private runService = new IntegrationRunService();
  private timer: NodeJS.Timeout | null = null;

  start() {
    console.log('[PollerService] Starting background polling scheduler (Interval: 5m)...');
    
    // Check and run background polling
    this.timer = setInterval(() => this.tick(), 5 * 60 * 1000);
    
    // Trigger initial tick asynchronously after server startup
    setTimeout(() => this.tick(), 5000);
  }

  stop() {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
      console.log('[PollerService] Stopped background poller.');
    }
  }

  private async tick() {
    console.log('[PollerService] Tick: Checking for active integrations to poll...');
    try {
      const integrations = await this.integrationService.listAll();

      // If DB has no integrations yet (e.g. fresh setup), run global polling to auto-discover integrations and events
      if (integrations.length === 0) {
        console.log('[PollerService] No integrations registered. Running global polling to auto-discover real integrations and events...');
        const result = await this.runService.pollAllIntegrations();
        console.log(`[PollerService] Global poll completed: ${result.message}`);
        return;
      }

      const activeIntegrations = integrations.filter((i) => i.isActive);
      console.log(`[PollerService] Found ${activeIntegrations.length} active integrations to scan.`);

      for (const integration of activeIntegrations) {
        try {
          console.log(`[PollerService] Polling integration: ${integration.name} (${integration.workdaySystemId})...`);
          const result = await this.runService.pollIntegration(integration.id);
          console.log(`[PollerService] Poll result for ${integration.name}: ${result.message} (${result.pulledEventsCount} events)`);
        } catch (error: any) {
          console.error(`[PollerService] Error polling integration ${integration.name} (${integration.workdaySystemId}):`, error.message);
        }
      }
    } catch (error: any) {
      console.error('[PollerService] Error in background scheduler tick:', error.message);
    }
  }
}
export const pollerService = new PollerService();
