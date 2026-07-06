import { Request, Response } from 'express';
import { IntegrationService } from '../services/integration.service';

export class IntegrationController {
  private integrationService = new IntegrationService();

  list = async (req: Request, res: Response): Promise<void> => {
    try {
      const list = await this.integrationService.listAll();
      res.status(200).json(list);
    } catch (error: any) {
      console.error('[IntegrationController] Error listing integrations:', error);
      res.status(500).json({ error: error.message || 'Internal Server Error' });
    }
  };

  discover = async (req: Request, res: Response): Promise<void> => {
    try {
      const integrations = await this.integrationService.discoverFromWorkday();
      res.status(200).json(integrations);
    } catch (error: any) {
      console.error('[IntegrationController] Error discovering integrations:', error);
      res.status(500).json({ error: error.message || 'Internal Server Error' });
    }
  };

  create = async (req: Request, res: Response): Promise<void> => {
    try {
      const { workdaySystemId, name, description, category, pollingInterval, autoLaunch } = req.body;

      if (!workdaySystemId || !name) {
        res.status(400).json({ error: 'workdaySystemId and name are required fields.' });
        return;
      }

      const created = await this.integrationService.register({
        workdaySystemId,
        name,
        description,
        category,
        pollingInterval,
        autoLaunch,
      });

      res.status(201).json(created);
    } catch (error: any) {
      console.error('[IntegrationController] Error registering integration:', error);
      res.status(400).json({ error: error.message || 'Internal Server Error' });
    }
  };

  update = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const { name, description, category, isActive, autoLaunch, pollingInterval } = req.body;

      const updated = await this.integrationService.update(id, {
        name,
        description,
        category,
        isActive,
        autoLaunch,
        pollingInterval,
      });

      res.status(200).json(updated);
    } catch (error: any) {
      console.error('[IntegrationController] Error updating integration:', error);
      res.status(400).json({ error: error.message || 'Internal Server Error' });
    }
  };

  getById = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const integration = await this.integrationService.getById(id);

      if (!integration) {
        res.status(404).json({ error: `Integration with ID ${id} not found.` });
        return;
      }

      res.status(200).json(integration);
    } catch (error: any) {
      console.error('[IntegrationController] Error getting integration by ID:', error);
      res.status(500).json({ error: error.message || 'Internal Server Error' });
    }
  };
}
export const integrationController = new IntegrationController();
