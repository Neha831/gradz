import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';

import { connectDb } from './config/db.js';
import { authRoutes } from './routes/authRoutes.js';
import { userRoutes } from './routes/userRoutes.js';
import { examRoutes } from './routes/examRoutes.js';
import { questionRoutes } from './routes/questionRoutes.js';
import { contactRoutes } from './routes/contactRoutes.js';
import { feedbackRoutes } from './routes/feedbackRoutes.js';
import { resultsRoutes } from './routes/resultsRoutes.js';
import { profileRoutes } from './routes/profileRoutes.js';
import { snapshotRoutes } from './routes/snapshotRoutes.js';
import { adminRoutes } from './routes/adminRoutes.js';
import { proctorRoutes } from './routes/proctorRoutes.js';
import { legacyRoutes } from './routes/legacyRoutes.js';
import { chatbotRoutes } from './routes/chatbotRoutes.js';
import { getSnapshotRootDir } from './controllers/snapshotController.js';
import { errorHandler } from './middleware/errorHandler.js';

dotenv.config();

const app = express();

const corsOrigin = process.env.CORS_ORIGIN;
const corsOptions =
  !corsOrigin || corsOrigin === '*'
    ? { origin: true, credentials: true }
    : {
        origin: corsOrigin.split(',').map((s) => s.trim()),
        credentials: true
      };
app.use(cors(corsOptions));
app.use(express.json());
app.use(morgan('dev'));

app.get('/health', (_req, res) => res.json({ ok: true }));

app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/exams', examRoutes);
app.use('/api/questions', questionRoutes);
app.use('/api/contact', contactRoutes);
app.use('/api/feedback', feedbackRoutes);
app.use('/api/results', resultsRoutes);
app.use('/api/profile', profileRoutes);
app.use('/api/snapshots', snapshotRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/proctor', proctorRoutes);
app.use('/api/chatbot', chatbotRoutes);

// Legacy PHP endpoint aliases for migration compatibility
app.use('/', legacyRoutes);

// Serve snapshot files for admin viewer
app.use('/snapshot-files', express.static(getSnapshotRootDir()));

const uploadDir = path.resolve(process.cwd(), 'uploads');
fs.mkdirSync(uploadDir, { recursive: true });
app.use('/uploads', express.static(uploadDir));

const serveClient =
  process.env.SERVE_CLIENT === 'true' || process.env.NODE_ENV === 'production';
const clientDist = path.resolve(
  process.cwd(),
  process.env.CLIENT_DIST || '../client/dist'
);

if (serveClient && fs.existsSync(clientDist)) {
  app.use(express.static(clientDist));
  app.get('*', (req, res, next) => {
    if (req.method !== 'GET') return next();
    const p = req.path;
    if (
      p.startsWith('/api') ||
      p.startsWith('/snapshot-files') ||
      p.startsWith('/uploads')
    ) {
      return next();
    }
    if (p === '/health') return next();
    if (p.endsWith('.php')) {
      return res.status(404).json({ success: false, message: 'Unknown legacy endpoint' });
    }
    res.sendFile(path.join(clientDist, 'index.html'), (err) => {
      if (err) next(err);
    });
  });
} else if (serveClient) {
  // eslint-disable-next-line no-console
  console.warn(
    `SERVE_CLIENT/production: React build not found at ${clientDist}. Run: cd client && npm run build`
  );
}

app.use(errorHandler);

const port = Number(process.env.PORT || 5000);

async function bootstrap() {
  await connectDb();
  app.listen(port, () => {
    // eslint-disable-next-line no-console
    console.log(`Server running at http://localhost:${port}`);
  });
}

bootstrap().catch((err) => {
  // eslint-disable-next-line no-console
  console.error('Startup error:', err.message);
  process.exit(1);
});

