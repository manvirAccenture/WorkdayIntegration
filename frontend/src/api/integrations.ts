import apiClient from './client';

export interface Integration {
  id: string;
  workdaySystemId: string;
  name: string;
  description?: string | null;
  category?: string | null;
  isActive: boolean;
  autoLaunch: boolean;
  pollingInterval: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateIntegrationPayload {
  workdaySystemId: string;
  name: string;
  description?: string;
  category?: string;
  pollingInterval?: string;
  autoLaunch?: boolean;
}

export interface UpdateIntegrationPayload {
  name?: string;
  description?: string | null;
  category?: string | null;
  isActive?: boolean;
  autoLaunch?: boolean;
  pollingInterval?: string;
}

export const integrationsApi = {
  list: async (): Promise<Integration[]> => {
    const { data } = await apiClient.get('/integrations');
    return data;
  },

  discover: async (): Promise<Integration[]> => {
    const { data } = await apiClient.get('/integrations/discover');
    return data;
  },

  create: async (payload: CreateIntegrationPayload): Promise<Integration> => {
    const { data } = await apiClient.post('/integrations', payload);
    return data;
  },

  update: async (id: string, payload: UpdateIntegrationPayload): Promise<Integration> => {
    const { data } = await apiClient.put(`/integrations/${id}`, payload);
    return data;
  },

  pollNow: async (id: string): Promise<{ success: boolean; pulledEventsCount: number; message: string }> => {
    const { data } = await apiClient.post(`/integrations/${id}/poll-now`);
    return data;
  },
};
