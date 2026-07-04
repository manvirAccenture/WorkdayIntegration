import { Request, Response } from 'express';
import { WorkdayConfigRepository } from '../repositories/workdayConfig.repository';

export class WorkdayConfigController {
  private configRepo = new WorkdayConfigRepository();

  getConfig = async (req: Request, res: Response): Promise<void> => {
    try {
      const config = await this.configRepo.getFirst();

      if (!config) {
        // Return blank fallback config showing nothing configured yet
        res.status(200).json({
          id: null,
          tenantName: '',
          apiEndpoint: '',
          clientId: '',
          hasClientSecret: false,
          hasRefreshToken: false,
        });
        return;
      }

      res.status(200).json({
        id: config.id,
        tenantName: config.tenantName,
        apiEndpoint: config.apiEndpoint,
        clientId: config.clientId,
        hasClientSecret: !!config.clientSecret,
        hasRefreshToken: !!config.refreshToken,
      });
    } catch (error: any) {
      console.error('[WorkdayConfigController] Error getting config:', error);
      res.status(500).json({ error: error.message || 'Internal Server Error' });
    }
  };

  saveConfig = async (req: Request, res: Response): Promise<void> => {
    try {
      const { tenantName, apiEndpoint, clientId, clientSecret, refreshToken } = req.body;

      if (!tenantName || !apiEndpoint || !clientId || !clientSecret || !refreshToken) {
        res.status(400).json({
          error: 'Missing required configuration fields. All credentials must be supplied.',
        });
        return;
      }

      await this.configRepo.upsert({
        tenantName,
        apiEndpoint,
        clientId,
        clientSecret,
        refreshToken,
      });

      res.status(200).json({
        success: true,
        message: 'Workday configuration credentials successfully saved.',
      });
    } catch (error: any) {
      console.error('[WorkdayConfigController] Error saving config:', error);
      res.status(500).json({ error: error.message || 'Internal Server Error' });
    }
  };
}
export const workdayConfigController = new WorkdayConfigController();
