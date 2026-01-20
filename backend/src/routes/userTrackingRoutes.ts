import { Router } from 'express';
import { UserTrackingController } from '../controllers/UserTrackingController.js';

const router = Router();
const controller = new UserTrackingController();

// User tracking endpoints - bind methods to controller instance
router.post('/login', controller.trackLogin.bind(controller));
router.get('/stats', controller.getStats.bind(controller));

// Domain configuration endpoints
router.get('/domain-config', controller.getAllDomainConfigs.bind(controller));
router.get('/domain-config/:domain', controller.getDomainConfig.bind(controller));
router.put('/domain-config/:domain', controller.updateDomainConfig.bind(controller));

export default router;
