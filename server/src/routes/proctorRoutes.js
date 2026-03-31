import { Router } from 'express';
import { requireAuth } from '../middleware/authMiddleware.js';
import { logTabSwitch } from '../controllers/proctorController.js';

export const proctorRoutes = Router();

proctorRoutes.post('/tab-switch', requireAuth, logTabSwitch);

