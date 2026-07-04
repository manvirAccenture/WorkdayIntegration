import { Router } from 'express';
import { integrationRunController } from '../controllers/integrationRun.controller';

const router = Router();

router.get('/', integrationRunController.list);
router.get('/:runId', integrationRunController.getById);
router.post('/:runId/relaunch', integrationRunController.relaunch);

export default router;
