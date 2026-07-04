import { IntegrationRepository } from '../repositories/integration.repository';
import { WorkdayConfigRepository } from '../repositories/workdayConfig.repository';
import { WorkdayService } from './workday.service';
import { Integration } from '@prisma/client';
import { env } from '../config/env';

export class IntegrationService {
  private integrationRepo = new IntegrationRepository();
  private configRepo = new WorkdayConfigRepository();
  private workdayService = new WorkdayService();

  async listAll(): Promise<Integration[]> {
    try {
      return await this.integrationRepo.findAll();
    } catch (err: any) {
      // Return empty list if DB connection failed (e.g. no DB yet)
      console.warn('[IntegrationService] Failed to fetch integrations from database:', err.message);
      return [];
    }
  }

  async getById(id: string): Promise<Integration | null> {
    return this.integrationRepo.findById(id);
  }

  async register(data: {
    workdaySystemId: string;
    name: string;
    description?: string;
    category?: string;
    pollingInterval?: string;
    autoLaunch?: boolean;
  }): Promise<Integration> {
    if (!data.workdaySystemId || !data.name) {
      throw new Error('workdaySystemId and name are required.');
    }

    const existing = await this.integrationRepo.findBySystemId(data.workdaySystemId);
    if (existing) {
      throw new Error(`Integration system with id ${data.workdaySystemId} is already registered.`);
    }

    return this.integrationRepo.create(data);
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
  ): Promise<Integration> {
    const existing = await this.integrationRepo.findById(id);
    if (!existing) {
      throw new Error(`Integration with ID ${id} not found.`);
    }
    return this.integrationRepo.update(id, data);
  }

  async discoverFromWorkday(): Promise<any[]> {
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
      throw new Error('Failed to load Workday configuration.');
    }

    return this.workdayService.discoverIntegrations(config);
  }
}
