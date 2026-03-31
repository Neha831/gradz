import { Router } from 'express';
import multer from 'multer';
import { body, param } from 'express-validator';
import { requireAuth } from '../middleware/authMiddleware.js';
import { requireRole } from '../middleware/roleMiddleware.js';
import { validateRequest } from '../middleware/requestValidation.js';
import {
  getQuestions,
  createExamQuestions,
  deleteQuestion,
  createQuestion,
  deleteQuestionsByExamCode,
  deleteMultipleExamCodes,
  deleteAllQuestions,
  listExamsOverview,
  uploadQuestionsExcel
} from '../controllers/questionController.js';

export const questionRoutes = Router();

const uploadExcel = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 8 * 1024 * 1024 }
});

// Admin: distinct exams table (overview)
questionRoutes.get(
  '/exams-overview',
  requireAuth,
  requireRole(['admin']),
  listExamsOverview
);

// Admin: upload questions from .xlsx
questionRoutes.post(
  '/upload-excel',
  requireAuth,
  requireRole(['admin']),
  uploadExcel.single('excel_file'),
  uploadQuestionsExcel
);

// Admin question bank view
questionRoutes.get(
  '/',
  requireAuth,
  requireRole(['admin']),
  getQuestions
);

// Admin create a single question
questionRoutes.post(
  '/',
  requireAuth,
  requireRole(['admin']),
  [
    body('exam_code').trim().isLength({ min: 1, max: 64 }).withMessage('exam_code must be 1-64 characters'),
    body('exam_title').trim().isLength({ min: 1, max: 200 }).withMessage('exam_title must be 1-200 characters'),
    body('exam_date').isISO8601().withMessage('exam_date must be a valid date'),
    body('duration').isInt({ min: 1, max: 600 }).withMessage('duration must be 1-600 minutes'),
    body('question_text').trim().isLength({ min: 1, max: 3000 }).withMessage('question_text must be 1-3000 characters'),
    body('option_1').trim().isLength({ min: 1, max: 1000 }).withMessage('option_1 must be 1-1000 characters'),
    body('option_2').trim().isLength({ min: 1, max: 1000 }).withMessage('option_2 must be 1-1000 characters'),
    body('option_3').trim().isLength({ min: 1, max: 1000 }).withMessage('option_3 must be 1-1000 characters'),
    body('option_4').trim().isLength({ min: 1, max: 1000 }).withMessage('option_4 must be 1-1000 characters'),
    body('correct_answer').isIn([1, 2, 3, 4, '1', '2', '3', '4']).withMessage('correct_answer must be 1-4'),
    body('marks').optional().isFloat({ min: 0, max: 100 }).withMessage('marks must be 0-100'),
    validateRequest
  ],
  createQuestion
);

// Back-compat: allow bulk exam insert via /api/exams (handled in examRoutes),
// but keep createExamQuestions here too if needed.
questionRoutes.post(
  '/bulk',
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
questionRoutes.delete(
  '/bulk/by-exam-code',
  requireAuth,
  requireRole(['admin']),
  [body('exam_code').trim().isLength({ min: 1, max: 64 }).withMessage('exam_code must be 1-64 characters'), validateRequest],
  deleteQuestionsByExamCode
);
questionRoutes.delete('/bulk/all', requireAuth, requireRole(['admin']), deleteAllQuestions);
questionRoutes.delete(
  '/bulk/by-exam-codes',
  requireAuth,
  requireRole(['admin']),
  [body('exam_codes').isArray({ min: 1 }).withMessage('exam_codes array is required'), validateRequest],
  deleteMultipleExamCodes
);

// Single question by Mongo id (after /bulk/* so "bulk" is not captured as :id)
questionRoutes.delete(
  '/:id',
  requireAuth,
  requireRole(['admin']),
  [param('id').trim().notEmpty().withMessage('id is required'), validateRequest],
  deleteQuestion
);
