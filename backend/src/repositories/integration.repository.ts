import { prisma } from '../config/db';
import { Integration } from '@prisma/client';

export class IntegrationRepository {
  async findAll(): Promise<Integration[]> {
    return prisma.integration.findMany({
      orderBy: { createdAt: 'desc' },
    });
  }

  async findById(id: string): Promise<Integration | null> {
    return prisma.integration.findUnique({
      where: { id },
    });
  }

  async findBySystemId(workdaySystemId: string): Promise<Integration | null> {
    return prisma.integration.findUnique({
      where: { workdaySystemId },
    });
  }

  async create(data: {
    workdaySystemId: string;
    name: string;
    description?: string;
    category?: string;
    isActive?: boolean;
    autoLaunch?: boolean;
    pollingInterval?: string;
  }): Promise<Integration> {
    return prisma.integration.create({
      data,
    });
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
    return prisma.integration.update({
      where: { id },
      data,
    });
  }
}
