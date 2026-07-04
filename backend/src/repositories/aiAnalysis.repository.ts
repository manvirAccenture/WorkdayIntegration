import { prisma } from '../config/db';
import { AiAnalysis } from '@prisma/client';

export class AiAnalysisRepository {
  async findByRunId(runId: string): Promise<AiAnalysis | null> {
    return prisma.aiAnalysis.findUnique({
      where: { runId },
    });
  }

  async createOrUpdate(data: {
    runId: string;
    suggestedFix: string;
    detectedRootCause: string;
    applied?: boolean;
  }): Promise<AiAnalysis> {
    const existing = await prisma.aiAnalysis.findUnique({
      where: { runId: data.runId },
    });

    if (existing) {
      return prisma.aiAnalysis.update({
        where: { id: existing.id },
        data: {
          suggestedFix: data.suggestedFix,
          detectedRootCause: data.detectedRootCause,
          applied: data.applied ?? existing.applied,
        },
      });
    }

    return prisma.aiAnalysis.create({
      data: {
        runId: data.runId,
        suggestedFix: data.suggestedFix,
        detectedRootCause: data.detectedRootCause,
        applied: data.applied ?? false,
      },
    });
  }

  async setApplied(runId: string, applied: boolean): Promise<AiAnalysis> {
    return prisma.aiAnalysis.update({
      where: { runId },
      data: { applied },
    });
  }
}
