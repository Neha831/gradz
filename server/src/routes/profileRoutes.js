import { Router } from 'express';
import { requireAuth } from '../middleware/authMiddleware.js';
import { getMe, updateMe, uploadProfileFiles } from '../controllers/profileController.js';
import { profileDirSegmentFromEmail } from '../utils/profileUploadPath.js';
import multer from 'multer';
import fs from 'fs';
import path from 'path';

export const profileRoutes = Router();

profileRoutes.get('/me', requireAuth, getMe);
profileRoutes.put('/me', requireAuth, updateMe);

const storage = multer.diskStorage({
  destination: (req, _file, cb) => {
    const email = profileDirSegmentFromEmail(req.user?.email);
    const dir = path.resolve(process.cwd(), 'uploads', 'profiles', email);
    fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname || '') || '.bin';
    const base = file.fieldname === 'profile_photo' ? 'photo' : 'document';
    cb(null, `${base}_${Date.now()}${ext}`);
  }
});
const upload = multer({
  storage,
  limits: { fileSize: 8 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const reject = (msg) => {
      const e = new Error(msg);
      e.statusCode = 400;
      cb(e);
    };
    if (file.fieldname === 'profile_photo') {
      if (/^image\//i.test(file.mimetype || '')) return cb(null, true);
      return reject('Profile photo must be an image file');
    }
    if (file.fieldname === 'id_document') {
      const m = file.mimetype || '';
      if (/^image\//i.test(m) || m === 'application/pdf') return cb(null, true);
      return reject('ID document must be an image or PDF');
    }
    return cb(null, true);
  }
});

profileRoutes.post(
  '/upload',
  requireAuth,
  upload.fields([
    { name: 'profile_photo', maxCount: 1 },
    { name: 'id_document', maxCount: 1 }
  ]),
  uploadProfileFiles
);

