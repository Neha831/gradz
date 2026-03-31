import { Router } from 'express';
import {
  login,
  register,
  getSecurityQuestion,
  resetPasswordBySecurityAnswer
} from '../controllers/authController.js';
import { body } from 'express-validator';
import { validateRequest } from '../middleware/requestValidation.js';

export const authRoutes = Router();

authRoutes.post(
  '/login',
  [
    body('role').optional().isIn(['admin', 'student']).withMessage('Role must be admin or student'),
    body('email_id').isEmail().withMessage('Valid email_id is required'),
    body('password').notEmpty().withMessage('Password is required'),
    validateRequest
  ],
  login
);
authRoutes.post(
  '/register',
  [
    body('role').isIn(['admin', 'student']).withMessage('Role must be admin or student'),
    body('email_id').isEmail().withMessage('Valid email_id is required'),
    body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
    validateRequest
  ],
  register
);
authRoutes.post(
  '/security-question',
  [
    body('email_id').isEmail().withMessage('Valid email_id is required'),
    body('role').optional().isIn(['admin', 'student']).withMessage('Role must be admin or student'),
    validateRequest
  ],
  getSecurityQuestion
);
authRoutes.post(
  '/reset-password',
  [
    body('email_id').isEmail().withMessage('Valid email_id is required'),
    body('role').optional().isIn(['admin', 'student']).withMessage('Role must be admin or student'),
    body('security_answer').notEmpty().withMessage('Security answer is required'),
    body('new_password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
    validateRequest
  ],
  resetPasswordBySecurityAnswer
);

