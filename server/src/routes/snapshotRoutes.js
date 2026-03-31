import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';

import { requireAuth } from '../middleware/authMiddleware.js';
import { requireRole } from '../middleware/roleMiddleware.js';
import { body } from 'express-validator';
import {
  getSnapshotRootDir,
  listSnapshotStudents,
  listSnapshotExamCodes,
  listSnapshotImages,
  listSnapshotImagesByExam,
  deleteSnapshotsByExam
} from '../controllers/snapshotController.js';
import { validateRequest } from '../middleware/requestValidation.js';

export const snapshotRoutes = Router();

function sanitizeSegment(str) {
  return String(str || '')
    .trim()
    .replace(/[^a-zA-Z0-9._-]/g, '_')
    .slice(0, 120);
}

const storage = multer.diskStorage({
  destination: (req, _file, cb) => {
    const student = sanitizeSegment(req.body?.student_name || req.body?.email_id || 'unknown');
    const examCode = sanitizeSegment(req.body?.exam_code || 'unknown');
    const dir = path.join(getSnapshotRootDir(), student, examCode);
    fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname || '') || '.jpg';
    cb(null, `snapshot_${Date.now()}${ext}`);
  }
});

const upload = multer({ storage });

// Student (or exam page): upload webcam snapshot
snapshotRoutes.post('/upload', requireAuth, upload.single('webcam_snapshot'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ success: false, message: 'Missing webcam_snapshot file' });
  }
  return res.json({ success: true, filename: req.file.filename });
});

// Admin snapshot viewer APIs
snapshotRoutes.get('/students', requireAuth, requireRole(['admin']), listSnapshotStudents);
snapshotRoutes.get('/students/:student/exams', requireAuth, requireRole(['admin']), listSnapshotExamCodes);
snapshotRoutes.get('/students/:student/exams/:examCode/images', requireAuth, requireRole(['admin']), listSnapshotImages);
snapshotRoutes.get('/by-exam/:examCode/images', requireAuth, requireRole(['admin']), listSnapshotImagesByExam);
snapshotRoutes.delete(
  '/by-exam',
  requireAuth,
  requireRole(['admin']),
  [body('exam_code').trim().notEmpty().withMessage('exam_code is required'), validateRequest],
  deleteSnapshotsByExam
);

