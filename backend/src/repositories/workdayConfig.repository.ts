import { prisma } from '../config/db';
import { WorkdayConfig } from '@prisma/client';

export class WorkdayConfigRepository {
  async getFirst(): Promise<WorkdayConfig | null> {
    return prisma.workdayConfig.findFirst();
  }

  async upsert(data: {
    tenantName: string;
    clientId: string;
    clientSecret: string;
    refreshToken: string;
    apiEndpoint: string;
  }): Promise<WorkdayConfig> {
    const existing = await prisma.workdayConfig.findFirst();

    if (existing) {
      return prisma.workdayConfig.update({
        where: { id: existing.id },
        data,
      });
    }

    return prisma.workdayConfig.create({
      data,
    });
  }
}
