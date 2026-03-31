import { Router } from 'express';
import multer from 'multer';
import { body, param } from 'express-validator';

import { requireAuth } from '../middleware/authMiddleware.js';
import { requireRole } from '../middleware/roleMiddleware.js';

import {
  allocateExam,
  getStudentExams,
  fetchExam,
  fetchGuestExam,
  submitExam,
  getTodayExamNotifications,
  validateGuestExamCode
} from '../controllers/examController.js';

import { createExamQuestions } from '../controllers/questionController.js';
import { validateRequest } from '../middleware/requestValidation.js';

export const examRoutes = Router();

const upload = multer().none();

// Admin: create exam (bulk insert question bank)
examRoutes.post(
  '/',
  requireAuth,
  requireRole(['admin']),
  [
    body('exam_code').trim().isLength({ min: 1, max: 64 }).withMessage('exam_code must be 1-64 characters'),
    body('exam_title').trim().isLength({ min: 1, max: 200 }).withMessage('exam_title must be 1-200 characters'),
    body('exam_date').isISO8601().withMessage('exam_date must be a valid date'),
    body('duration').isInt({ min: 1, max: 600 }).withMessage('duration must be 1-600 minutes'),
    body('questions').isArray({ min: 1 }).withMessage('questions array is required'),
    validateRequest
  ],
  createExamQuestions
);

// Student: list available exams for a domain/date
examRoutes.get(
  '/',
  requireAuth,
  requireRole(['student']),
  getStudentExams
);

// Student: today notifications (legacy get_exam_notifications.php parity)
examRoutes.get(
  '/notifications/today',
  requireAuth,
  requireRole(['student']),
  getTodayExamNotifications
);

// Guest: validate exam code before start
examRoutes.post(
  '/guest/validate',
  [body('exam_code').trim().isLength({ min: 1, max: 64 }).withMessage('exam_code must be 1-64 characters'), validateRequest],
  validateGuestExamCode
);
examRoutes.get(
  '/guest/:examCode',
  [param('examCode').trim().notEmpty().withMessage('examCode is required'), validateRequest],
  fetchGuestExam
);
examRoutes.post(
  '/guest/submit',
  upload,
  [
    body('exam_code').trim().isLength({ min: 1, max: 64 }).withMessage('exam_code must be 1-64 characters'),
    body('email_id').isEmail().withMessage('Valid email_id is required'),
    body('student_name').trim().isLength({ min: 1, max: 120 }).withMessage('student_name must be 1-120 characters'),
    body('time_taken_seconds').optional().isInt({ min: 0, max: 21600 }).withMessage('time_taken_seconds must be 0-21600'),
    validateRequest
  ],
  submitExam
);

// Fetch exam by exam_code
examRoutes.get(
  '/:examCode',
  requireAuth,
  [param('examCode').trim().notEmpty().withMessage('examCode is required'), validateRequest],
  fetchExam
);

// Submit answers (FormData)
examRoutes.post(
  '/submit',
  requireAuth,
  upload,
  [
    body('exam_code').trim().isLength({ min: 1, max: 64 }).withMessage('exam_code must be 1-64 characters'),
    body('email_id').isEmail().withMessage('Valid email_id is required'),
    body('student_name').trim().isLength({ min: 1, max: 120 }).withMessage('student_name must be 1-120 characters'),
    body('time_taken_seconds').optional().isInt({ min: 0, max: 21600 }).withMessage('time_taken_seconds must be 0-21600'),
    validateRequest
  ],
  submitExam
);

// Admin: allocate exam questions to a domain
examRoutes.post(
  '/allocate',
  requireAuth,
  requireRole(['admin']),
  [
    body('exam_code').trim().isLength({ min: 1, max: 64 }).withMessage('exam_code must be 1-64 characters'),
    body('domain').trim().isLength({ min: 1, max: 120 }).withMessage('domain must be 1-120 characters'),
    validateRequest
  ],
  allocateExam
);

