import { Router, Request, Response } from 'express';
import { WorkdayService } from '../services/workday.service';
import { WorkdayConfigRepository } from '../repositories/workdayConfig.repository';
import { env } from '../config/env';

const router = Router();
const workdayService = new WorkdayService();
const configRepo = new WorkdayConfigRepository();

// Helper to get active workday config
async function getActiveConfig() {
  let config = await configRepo.getFirst();
  const hasPlaceholder = !config || config.clientId.includes('YOUR_');

  if (hasPlaceholder) {
    config = await configRepo.upsert({
      tenantName: env.WORKDAY_TENANT_NAME || 'Dpt3',
      clientId: env.WORKDAY_CLIENT_ID || 'YOUR_CLIENT_ID',
      clientSecret: env.WORKDAY_CLIENT_SECRET || 'YOUR_CLIENT_SECRET',
      refreshToken: env.WORKDAY_REFRESH_TOKEN || 'YOUR_REFRESH_TOKEN',
      apiEndpoint: env.WORKDAY_API_ENDPOINT || 'https://wd3-impl-services1.workday.com',
    });
  }

  if (!config) {
    throw new Error('Failed to load Workday configuration.');
  }
  return config;
}

// 1. Get Raw Systems XML
router.get('/raw-systems', async (req: Request, res: Response) => {
  try {
    const config = await getActiveConfig();
    const xml = await workdayService.getRawIntegrationSystems(config);
    
    // Set headers so browser renders it as XML
    res.setHeader('Content-Type', 'application/xml');
    res.status(200).send(xml);
  } catch (error: any) {
    res.setHeader('Content-Type', 'text/plain');
    res.status(500).send(`Error fetching raw systems: ${error.message}`);
  }
});

// 2. Get Raw Events XML
router.get('/raw-events', async (req: Request, res: Response) => {
  try {
    const config = await getActiveConfig();
    const hours = parseInt(req.query.hours as string || '24', 10);
    const since = new Date(Date.now() - hours * 60 * 60 * 1000);
    
    const xml = await workdayService.getRawIntegrationEvents(config, since);
    
    // Set headers so browser renders it as XML
    res.setHeader('Content-Type', 'application/xml');
    res.status(200).send(xml);
  } catch (error: any) {
    res.setHeader('Content-Type', 'text/plain');
    res.status(500).send(`Error fetching raw events: ${error.message}`);
  }
});

// 3. Get Raw Events XML for a specific Integration System ID
router.get('/raw-events/:systemId', async (req: Request, res: Response) => {
  const { systemId } = req.params;
  try {
    const config = await getActiveConfig();
    const hours = parseInt(req.query.hours as string || '24', 10);
    const since = new Date(Date.now() - hours * 60 * 60 * 1000);
    
    const xml = await workdayService.getRawIntegrationEvents(config, since, systemId);
    
    // Set headers so browser renders it as XML
    res.setHeader('Content-Type', 'application/xml');
    res.status(200).send(xml);
  } catch (error: any) {
    res.setHeader('Content-Type', 'text/plain');
    res.status(500).send(`Error fetching raw events for ${systemId}: ${error.message}`);
  }
});

export default router;
