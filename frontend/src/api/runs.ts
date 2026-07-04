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
  errorMessage: string | null;
  integration?: {
    id: string;
    workdaySystemId: string;
    name: string;
  };
}

export interface IntegrationRunDetail extends IntegrationRunSummary {
  logs: string | null;
  aiAnalysis: AiAnalysis | null;
}

export interface RelaunchResult {
  success: boolean;
  launchedEventId: string;
  message: string;
}

export const runsApi = {
  list: async (filters?: { status?: string; integrationId?: string }): Promise<IntegrationRunSummary[]> => {
    const params = new URLSearchParams();
    if (filters?.status) params.set('status', filters.status);
    if (filters?.integrationId) params.set('integrationId', filters.integrationId);
    const { data } = await apiClient.get('/runs', { params });
    return data;
  },

  getById: async (runId: string): Promise<IntegrationRunDetail> => {
    const { data } = await apiClient.get(`/runs/${runId}`);
    return data;
  },

  relaunch: async (runId: string): Promise<RelaunchResult> => {
    const { data } = await apiClient.post(`/runs/${runId}/relaunch`);
    return data;
  },
};
