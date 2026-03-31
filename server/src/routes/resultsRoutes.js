import { Router } from 'express';
import { body, query } from 'express-validator';
import { requireAuth } from '../middleware/authMiddleware.js';
import { requireRole } from '../middleware/roleMiddleware.js';
import { validateRequest } from '../middleware/requestValidation.js';
import {
  adminExamResults,
  studentResultsAnalysis,
  studentExamsList,
  studentExamDetail,
  shareSingleResult,
  shareAllResults,
  exportExamResultsCsv,
  deleteAllExamResults
} from '../controllers/resultsController.js';

export const resultsRoutes = Router();

// Admin: exam results by exam_code (query param)
resultsRoutes.get(
  '/admin',
  requireAuth,
  requireRole(['admin']),
  [query('exam_code').trim().isLength({ min: 1, max: 64 }).withMessage('exam_code must be 1-64 characters'), validateRequest],
  adminExamResults
);
resultsRoutes.post(
  '/admin/share-one',
  requireAuth,
  requireRole(['admin']),
  [
    body('exam_code').trim().isLength({ min: 1, max: 64 }).withMessage('exam_code must be 1-64 characters'),
    body('email_id').isEmail().withMessage('Valid email_id is required'),
    validateRequest
  ],
  shareSingleResult
);
resultsRoutes.post(
  '/admin/share-all',
  requireAuth,
  requireRole(['admin']),
  [body('exam_code').trim().isLength({ min: 1, max: 64 }).withMessage('exam_code must be 1-64 characters'), validateRequest],
  shareAllResults
);
resultsRoutes.get(
  '/admin/export',
  requireAuth,
  requireRole(['admin']),
  [query('exam_code').trim().isLength({ min: 1, max: 64 }).withMessage('exam_code must be 1-64 characters'), validateRequest],
  exportExamResultsCsv
);
resultsRoutes.delete(
  '/admin',
  requireAuth,
  requireRole(['admin']),
  [body('exam_code').trim().isLength({ min: 1, max: 64 }).withMessage('exam_code must be 1-64 characters'), validateRequest],
  deleteAllExamResults
);

// Student: analysis and list/detail
resultsRoutes.get('/student/analysis', requireAuth, requireRole(['student']), studentResultsAnalysis);
resultsRoutes.get('/student/exams', requireAuth, requireRole(['student']), studentExamsList);
resultsRoutes.get('/student/exams/:examCode', requireAuth, requireRole(['student']), studentExamDetail);

