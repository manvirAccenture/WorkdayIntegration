import { Request, Response } from 'express';
import { workdayConfig, updateWorkdayConfig } from '../config/workdayConfig';

export class WorkdayConfigController {
  getConfig = async (req: Request, res: Response): Promise<void> => {
    try {
      res.status(200).json({
        id: workdayConfig.id,
        tenantName: workdayConfig.tenantName,
        apiEndpoint: workdayConfig.apiEndpoint,
        clientId: workdayConfig.clientId,
        hasClientSecret: !!workdayConfig.clientSecret,
        hasRefreshToken: !!workdayConfig.refreshToken,
      });
    } catch (error: any) {
      console.error('[WorkdayConfigController] Error getting config:', error);
      res.status(500).json({ error: error.message || 'Internal Server Error' });
    }
  };

  saveConfig = async (req: Request, res: Response): Promise<void> => {
    try {
      const { tenantName, apiEndpoint, clientId, clientSecret, refreshToken } = req.body;

      if (!tenantName || !apiEndpoint || !clientId) {
        res.status(400).json({
          error: 'Tenant Name, API Endpoint, and Client ID are required.',
        });
        return;
      }

      const finalClientSecret = clientSecret || workdayConfig.clientSecret;
      const finalRefreshToken = refreshToken || workdayConfig.refreshToken;

      if (!finalClientSecret || !finalRefreshToken) {
        res.status(400).json({
          error: 'Client Secret and Refresh Token are required.',
        });
        return;
      }

      updateWorkdayConfig({
        tenantName,
        apiEndpoint,
        clientId,
        clientSecret: finalClientSecret,
        refreshToken: finalRefreshToken,
      });

      res.status(200).json({
        success: true,
        message: 'Workday configuration credentials successfully saved in-memory.',
      });
    } catch (error: any) {
      console.error('[WorkdayConfigController] Error saving config:', error);
      res.status(500).json({ error: error.message || 'Internal Server Error' });
    }
  };
}
export const workdayConfigController = new WorkdayConfigController();
