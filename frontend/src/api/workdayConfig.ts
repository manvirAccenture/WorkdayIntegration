import apiClient from './client';

export interface WorkdayConfigResponse {
  id: string | null;
  tenantName: string;
  apiEndpoint: string;
  clientId: string;
  hasClientSecret: boolean;
  hasRefreshToken: boolean;
}

export interface WorkdayConfigPayload {
  tenantName: string;
  apiEndpoint: string;
  clientId: string;
  clientSecret: string;
  refreshToken: string;
}

export const workdayConfigApi = {
  getConfig: async (): Promise<WorkdayConfigResponse> => {
    const { data } = await apiClient.get('/workday/config');
    return data;
  },

  saveConfig: async (payload: WorkdayConfigPayload): Promise<{ success: boolean; message: string }> => {
    const { data } = await apiClient.post('/workday/config', payload);
    return data;
  },
};
