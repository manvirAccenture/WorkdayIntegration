import { env } from './env';

export interface WorkdayConfig {
  id: string;
  tenantName: string;
  clientId: string;
  clientSecret: string;
  refreshToken: string;
  apiEndpoint: string;
}

export let workdayConfig: WorkdayConfig = {
  id: 'env-config',
  tenantName: env.WORKDAY_TENANT_NAME || '',
  clientId: env.WORKDAY_CLIENT_ID || '',
  clientSecret: env.WORKDAY_CLIENT_SECRET || '',
  refreshToken: env.WORKDAY_REFRESH_TOKEN || '',
  apiEndpoint: env.WORKDAY_API_ENDPOINT || '',
};

export const updateWorkdayConfig = (newConfig: Partial<WorkdayConfig>) => {
  workdayConfig = {
    ...workdayConfig,
    ...newConfig,
  };
  return workdayConfig;
};
