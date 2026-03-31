import { Router } from 'express';
import { requireAuth } from '../middleware/authMiddleware.js';
import { requireRole } from '../middleware/roleMiddleware.js';
import { getDashboardStats } from '../controllers/adminController.js';

export const adminRoutes = Router();

adminRoutes.get('/stats', requireAuth, requireRole(['admin']), getDashboardStats);

