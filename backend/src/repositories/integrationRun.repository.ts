import { prisma } from '../config/db';
import { IntegrationRun, Integration, AiAnalysis } from '@prisma/client';

export class IntegrationRunRepository {
  async findAll(filters?: {
    status?: string;
    integrationId?: string;
  }): Promise<(IntegrationRun & { integration: Integration })[]> {
    const whereClause: any = {};

    if (filters?.status) {
      whereClause.status = filters.status;
    }
    if (filters?.integrationId) {
      whereClause.integrationId = filters.integrationId;
    }

    return prisma.integrationRun.findMany({
      where: whereClause,
      include: {
        integration: true,
      },
      orderBy: {
        startedAt: 'desc',
      },
    });
  }

  async findById(
    id: string
  ): Promise<(IntegrationRun & { integration: Integration; aiAnalysis: AiAnalysis | null }) | null> {
    return prisma.integrationRun.findUnique({
      where: { id },
      include: {
        integration: true,
        aiAnalysis: true,
      },
    });
  }

  async upsert(data: {
    id: string;
    integrationId: string;
    status: string;
    runBy?: string | null;
    startedAt: Date;
    completedAt?: Date | null;
    logs?: string | null;
    errorMessage?: string | null;
  }): Promise<IntegrationRun> {
    return prisma.integrationRun.upsert({
      where: { id: data.id },
      update: {
        status: data.status,
        runBy: data.runBy,
        completedAt: data.completedAt,
        logs: data.logs,
        errorMessage: data.errorMessage,
      },
      create: {
        id: data.id,
        integrationId: data.integrationId,
        status: data.status,
        runBy: data.runBy,
        startedAt: data.startedAt,
        completedAt: data.completedAt,
        logs: data.logs,
        errorMessage: data.errorMessage,
      },
    });
  }
}
