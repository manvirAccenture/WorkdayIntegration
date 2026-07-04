import { Request, Response } from 'express';
import { IntegrationRunService } from '../services/integrationRun.service';

export class IntegrationRunController {
  private runService = new IntegrationRunService();

  list = async (req: Request, res: Response): Promise<void> => {
    try {
      const status = req.query.status as string | undefined;
      const integrationId = req.query.integrationId as string | undefined;

      const runs = await this.runService.listAll({ status, integrationId });
      res.status(200).json(runs);
    } catch (error: any) {
      console.error('[IntegrationRunController] Error listing runs:', error);
      res.status(500).json({ error: error.message || 'Internal Server Error' });
    }
  };

  getById = async (req: Request, res: Response): Promise<void> => {
    try {
      const { runId } = req.params;
      const runDetails = await this.runService.getById(runId);

      if (!runDetails) {
        res.status(404).json({ error: `Integration run event with ID ${runId} not found.` });
        return;
      }

      res.status(200).json(runDetails);
    } catch (error: any) {
      console.error('[IntegrationRunController] Error getting run by ID:', error);
      res.status(500).json({ error: error.message || 'Internal Server Error' });
    }
  };

  relaunch = async (req: Request, res: Response): Promise<void> => {
    try {
      const { runId } = req.params;
      const result = await this.runService.relaunch(runId);
      res.status(202).json(result);
    } catch (error: any) {
      console.error('[IntegrationRunController] Error launching integration:', error);
      res.status(500).json({ error: error.message || 'Internal Server Error' });
    }
  };

  pollNow = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const result = await this.runService.pollIntegration(id);
      res.status(200).json(result);
    } catch (error: any) {
      console.error('[IntegrationRunController] Error polling now:', error);
      res.status(500).json({ error: error.message || 'Internal Server Error' });
    }
  };
}
export const integrationRunController = new IntegrationRunController();
