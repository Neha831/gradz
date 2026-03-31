import { Router } from 'express';
import { requireAuth } from '../middleware/authMiddleware.js';
import { requireRole } from '../middleware/roleMiddleware.js';
import {
  listUsers,
  createStudent,
  updateStudent,
  deleteStudent,
  exportStudentsCsv,
  exportStudentsXlsx
} from '../controllers/userController.js';

export const userRoutes = Router();

userRoutes.get('/', requireAuth, requireRole(['admin']), listUsers);
userRoutes.get('/export', requireAuth, requireRole(['admin']), exportStudentsCsv);
userRoutes.get('/export-xlsx', requireAuth, requireRole(['admin']), exportStudentsXlsx);
userRoutes.post('/', requireAuth, requireRole(['admin']), createStudent);
userRoutes.put('/:id', requireAuth, requireRole(['admin']), updateStudent);
userRoutes.delete('/:id', requireAuth, requireRole(['admin']), deleteStudent);

