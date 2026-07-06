import { Router } from 'express';
import { integrationRunController } from '../controllers/integrationRun.controller';

const router = Router();

router.get('/', integrationRunController.list);
router.get('/:runId', integrationRunController.getById);
router.post('/:runId/relaunch', integrationRunController.relaunch);
router.post('/:runId/apply-fix', integrationRunController.applyFix);

export default router;
