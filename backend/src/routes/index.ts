import { Router } from 'express';
import workdayRoutes from './workdayConfig.routes';
import integrationRoutes from './integration.routes';
import runRoutes from './integrationRun.routes';
import testRoutes from './test.routes';

const router = Router();

router.use('/workday', workdayRoutes);
router.use('/integrations', integrationRoutes);
router.use('/runs', runRoutes);
router.use('/test', testRoutes);

export default router;
