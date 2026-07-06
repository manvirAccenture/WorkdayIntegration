import { Router } from 'express';
import { integrationController } from '../controllers/integration.controller';
import { integrationRunController } from '../controllers/integrationRun.controller';

const router = Router();

router.get('/', integrationController.list);
router.get('/discover', integrationController.discover);
router.get('/:id', integrationController.getById);
router.post('/', integrationController.create);
router.put('/:id', integrationController.update);

// Action route to poll immediately
router.post('/:id/poll-now', integrationRunController.pollNow);

export default router;
