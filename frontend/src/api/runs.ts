import apiClient from './client';

export interface AiAnalysis {
  id?: string;
  detectedRootCause: string;
  suggestedFix: string;
  applied: boolean;
  createdAt?: string;
}

export interface IntegrationRunSummary {
  id: string;
  integrationId: string;
  status: string;
  runBy: string | null;
  startedAt: string;
  completedAt: string | null;
  completedAtFormatted?: string | null;
  errorMessage: string | null;
  errorsWarnings?: string;
  integrationEvent?: string;
  integration?: {
    id: string;
    workdaySystemId: string;
    name: string;
  };
}

export interface IntegrationRunDetail extends IntegrationRunSummary {
  logs: string | null;
  aiAnalysis: AiAnalysis | null;
  launchParameters?: { name: string; value: string }[];
}

export interface RelaunchResult {
  success: boolean;
  launchedEventId: string;
  message: string;
}

export const runsApi = {
  list: async (filters?: { status?: string; integrationId?: string; interval?: string }): Promise<IntegrationRunSummary[]> => {
    const params: any = {};
    if (filters?.status) params.status = filters.status;
    if (filters?.integrationId) params.integrationId = filters.integrationId;
    if (filters?.interval) params.interval = filters.interval;
    const { data } = await apiClient.get('/runs', { params });
    return data;
  },

  getById: async (runId: string): Promise<IntegrationRunDetail> => {
    const { data } = await apiClient.get(`/runs/${runId}`);
    return data;
  },

  relaunch: async (runId: string, launchParams?: { name: string; value: string }[]): Promise<RelaunchResult> => {
    const { data } = await apiClient.post(`/runs/${runId}/relaunch`, { launchParams });
    return data;
  },

  applyFix: async (runId: string): Promise<any> => {
    const { data } = await apiClient.post(`/runs/${runId}/apply-fix`);
    return data;
  },
};
