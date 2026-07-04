import { Router } from 'express';
import { workdayConfigController } from '../controllers/workdayConfig.controller';

const router = Router();

router.get('/config', workdayConfigController.getConfig);
router.post('/config', workdayConfigController.saveConfig);

export default router;
