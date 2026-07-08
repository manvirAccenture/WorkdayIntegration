import { workdayConfig } from '../config/workdayConfig';
import { WorkdayService } from './workday.service';

export class IntegrationService {
  private workdayService = new WorkdayService();

  async listAll(): Promise<any[]> {
    try {
      const integrations = await this.discoverFromWorkday();
      return integrations.map((i) => ({
        id: i.workdaySystemId,
        workdaySystemId: i.workdaySystemId,
        name: i.name,
        description: i.description,
        category: i.category,
        isActive: true,
        autoLaunch: false,
        pollingInterval: '10m',
      }));
    } catch (err: any) {
      console.warn('[IntegrationService] Failed to discover integrations from Workday:', err.message);
      return [];
    }
  }

  async getById(id: string): Promise<any | null> {
    const integrations = await this.listAll();
    return integrations.find((i) => i.id === id) || null;
  }

  async register(data: {
    workdaySystemId: string;
    name: string;
    description?: string;
    category?: string;
    pollingInterval?: string;
    autoLaunch?: boolean;
  }): Promise<any> {
    return {
      id: data.workdaySystemId,
      ...data,
      isActive: true,
    };
  }

  async update(
    id: string,
    data: {
      name?: string;
      description?: string | null;
      category?: string | null;
      isActive?: boolean;
      autoLaunch?: boolean;
      pollingInterval?: string;
    }
  ): Promise<any> {
    return {
      id,
      ...data,
    };
  }

  async discoverFromWorkday(): Promise<any[]> {
    return this.workdayService.discoverIntegrations(workdayConfig);
  }
}
