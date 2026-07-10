import { Router } from 'express';
import workdayRoutes from './workdayConfig.routes';
import integrationRoutes from './integration.routes';
import runRoutes from './integrationRun.routes';

const router = Router();

router.use('/workday', workdayRoutes);
router.use('/integrations', integrationRoutes);
router.use('/runs', runRoutes);

export default router;
