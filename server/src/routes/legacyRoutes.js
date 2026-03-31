import { Router } from 'express';
import multer from 'multer';
import jwt from 'jsonwebtoken';
import fs from 'fs';
import path from 'path';

import {
  login,
  register,
  getSecurityQuestion,
  resetPasswordBySecurityAnswer
} from '../controllers/authController.js';
import { createStudent, exportStudentsCsv } from '../controllers/userController.js';
import {
  getQuestions,
  createExamQuestions,
  deleteQuestion
} from '../controllers/questionController.js';
import {
  allocateExam,
  fetchGuestExam,
  submitExam,
  validateGuestExamCode
} from '../controllers/examController.js';
import { submitContact } from '../controllers/contactController.js';
import { submitFeedback } from '../controllers/feedbackController.js';
import { logTabSwitch } from '../controllers/proctorController.js';
import { getSnapshotRootDir } from '../controllers/snapshotController.js';
import { User } from '../models/User.js';
import { fixLegacyProfileUploadUrl } from '../utils/profileUploadPath.js';
import { Question } from '../models/Question.js';
import { Submission } from '../models/Submission.js';
import { SharedResult } from '../models/SharedResult.js';

const upload = multer().none();
export const legacyRoutes = Router();

function getTokenUser(req) {
  try {
    const auth = req.headers.authorization || '';
    const token = auth.startsWith('Bearer ') ? auth.slice(7) : '';
    if (!token) return null;
    const secret = process.env.JWT_SECRET;
    if (!secret) return null;
    return jwt.verify(token, secret);
  } catch {
    return null;
  }
}

function readEmail(req) {
  const tokenUser = getTokenUser(req);
  if (tokenUser?.email) return String(tokenUser.email).trim().toLowerCase();
  return String(req.body?.email_id || req.query?.email_id || '').trim().toLowerCase();
}

legacyRoutes.post('/login.php', (req, res) => {
  req.body = { ...(req.body || {}), role: req.body?.role || 'student' };
  return login(req, res);
});
legacyRoutes.get('/login.php', (_req, res) => res.redirect(307, '/login'));
legacyRoutes.post('/loginadmin.php', (req, res) => {
  req.body = { ...(req.body || {}), role: 'admin' };
  return login(req, res);
});
legacyRoutes.get('/loginadmin.php', (_req, res) => res.redirect(307, '/login'));
legacyRoutes.post('/loginstudent.php', (req, res) => {
  req.body = { ...(req.body || {}), role: 'student' };
  return login(req, res);
});
legacyRoutes.get('/loginstudent.php', (_req, res) => res.redirect(307, '/login'));
legacyRoutes.post('/register.php', (req, res) => {
  req.body = { ...(req.body || {}), role: req.body?.role || 'admin' };
  return register(req, res);
});
legacyRoutes.get('/register.php', (_req, res) => res.redirect(307, '/register'));

// Lightweight legacy session endpoints (JWT world)
legacyRoutes.get('/check_session.php', (req, res) => {
  const tokenUser = getTokenUser(req);
  if (!tokenUser) return res.json({ success: false, logged_in: false });
  return res.json({
    success: true,
    logged_in: true,
    user: {
      email_id: tokenUser.email || '',
      role: tokenUser.role || ''
    }
  });
});
legacyRoutes.post('/logout.php', (_req, res) => res.json({ success: true, message: 'Logged out' }));
legacyRoutes.post('/logoutadmin.php', (_req, res) => res.json({ success: true, message: 'Logged out' }));
legacyRoutes.get('/api/ping.php', (_req, res) => res.json({ ok: true, source: 'mern' }));
legacyRoutes.get('/api/gradezy_results.php', (req, res) => {
  const qs = new URLSearchParams(req.query || {}).toString();
  const target = qs ? `/fetch_results.php?${qs}` : '/fetch_results.php';
  return res.redirect(307, target);
});
legacyRoutes.post('/reset_password.php', upload, resetPasswordBySecurityAnswer);
legacyRoutes.get('/db_config.php', (_req, res) =>
  res.json({ success: true, message: 'DB handled by MERN server config' })
);
legacyRoutes.post('/grant_permissions.php', (_req, res) =>
  res.json({ success: true, message: 'No runtime permissions needed in MERN mode' })
);
legacyRoutes.get('/dashboard.php', (_req, res) => res.redirect(307, '/admin'));
legacyRoutes.get('/crud.php', (_req, res) => res.redirect(307, '/admin/questions/manage'));

// Legacy PHP page entrypoints -> React routes
const legacyPageAliases = [
  ['/loginadmin.php', '/login'],
  ['/loginstudent.php', '/login'],
  ['/register.php', '/register'],
  ['/reset_password.php', '/forgot-password'],
  ['/process_forgot_password.php', '/forgot-password'],
  ['/add_student.php', '/admin/students/add'],
  ['/allocate_exam.php', '/admin/allocate'],
  ['/admin_view.php', '/admin/results']
];
for (const [from, to] of legacyPageAliases) {
  legacyRoutes.get(from, (_req, res) => res.redirect(307, to));
}
legacyRoutes.get('/cashify/default.php', (_req, res) => res.redirect(307, '/login'));
legacyRoutes.get('/pg/default.php', (_req, res) => res.redirect(307, '/login'));
legacyRoutes.get('/pg/default.php.old.php', (_req, res) => res.redirect(307, '/login'));
legacyRoutes.get('/pgm/default.php', (_req, res) => res.redirect(307, '/login'));
legacyRoutes.get('/skillup/default.php', (_req, res) => res.redirect(307, '/login'));
legacyRoutes.get('/old.php', (_req, res) => res.redirect(307, '/login'));

legacyRoutes.get('/get_user_profile.php', async (req, res) => {
  const email = readEmail(req);
  if (!email) return res.status(400).json({ success: false, message: 'email_id required' });
  const u = await User.findOne({ email_id: email }).select('full_name email_id').lean();
  if (!u) return res.status(404).json({ success: false, message: 'User not found' });
  return res.json({ success: true, full_name: u.full_name || '', email_id: u.email_id });
});

legacyRoutes.get('/get_profile.php', async (req, res) => {
  const email = readEmail(req);
  if (!email) return res.status(400).json({ success: false, message: 'email_id required' });
  const u = await User.findOne({ email_id: email }).select('-passwordHash').lean();
  if (!u) return res.status(404).json({ success: false, message: 'User not found' });
  const profile = { ...u };
  const id = profile.email_id || '';
  profile.profile_photo_url = fixLegacyProfileUploadUrl(profile.profile_photo_url || '', id);
  profile.id_document_url = fixLegacyProfileUploadUrl(profile.id_document_url || '', id);
  return res.json({ success: true, profile });
});

legacyRoutes.get('/check_profile.php', async (req, res) => {
  const email = readEmail(req);
  if (!email) return res.status(400).json({ success: false, message: 'email_id required' });
  const u = await User.findOne({ email_id: email })
    .select('full_name phone_number college_name course_branch')
    .lean();
  if (!u) return res.status(404).json({ success: false, message: 'User not found' });
  const is_complete = !!(u.full_name && u.phone_number && u.college_name && u.course_branch);
  return res.json({ success: true, is_complete });
});

legacyRoutes.post('/check_exam_code.php', upload, async (req, res) => {
  const exam_code = String(req.body?.exam_code || '').trim();
  const email_id = readEmail(req);
  if (!exam_code) return res.status(400).json({ success: false, message: 'exam_code required' });

  const exam = await Question.findOne({ exam_code }).select('exam_code').lean();
  if (!exam) return res.status(404).json({ success: false, message: 'Invalid exam code' });

  let already_submitted = false;
  if (email_id) {
    already_submitted = !!(await Submission.exists({ exam_code, email_id }));
  }
  return res.json({ success: true, valid: true, already_submitted });
});

legacyRoutes.get('/fetch_exam.php', async (req, res) => {
  req.params = { ...(req.params || {}), examCode: String(req.query?.exam_code || '') };
  return fetchGuestExam(req, res);
});
legacyRoutes.post('/submit_exam.php', upload, submitExam);
legacyRoutes.post('/save_exam.php', createExamQuestions);

legacyRoutes.post('/allocate_exam.php', upload, allocateExam);
legacyRoutes.get('/fetch_questions.php', getQuestions);
legacyRoutes.post('/delete_question.php', upload, async (req, res) => {
  req.params = { ...(req.params || {}), id: String(req.body?.id || '') };
  return deleteQuestion(req, res);
});
legacyRoutes.post('/delete_exams.php', upload, async (req, res) => {
  const one = String(req.body?.exam_code || '').trim();
  const many = Array.isArray(req.body?.exam_codes)
    ? req.body.exam_codes.map((x) => String(x || '').trim()).filter(Boolean)
    : [];
  const exam_codes = one ? [one] : many;
  if (!exam_codes.length) {
    return res.status(400).json({ success: false, message: 'exam_code or exam_codes required' });
  }

  const [q, s, sh] = await Promise.all([
    Question.deleteMany({ exam_code: { $in: exam_codes } }),
    Submission.deleteMany({ exam_code: { $in: exam_codes } }),
    SharedResult.deleteMany({ exam_code: { $in: exam_codes } })
  ]);
  return res.json({
    success: true,
    message: 'Deleted exam data',
    exam_codes,
    deleted: {
      questions: q.deletedCount || 0,
      submissions: s.deletedCount || 0,
      shared_results: sh.deletedCount || 0
    }
  });
});
legacyRoutes.post('/delete_exam_questions.php', upload, async (req, res) => {
  const exam_code = String(req.body?.exam_code || '').trim();
  if (!exam_code) return res.status(400).json({ success: false, message: 'exam_code required' });
  const deleted = await Question.deleteMany({ exam_code });
  return res.json({
    success: true,
    message: `Deleted ${deleted.deletedCount || 0} question(s) for ${exam_code}`
  });
});
legacyRoutes.get('/delete_exam_questions.php', (_req, res) => res.redirect(307, '/admin/questions/manage'));
legacyRoutes.post('/update_question.php', upload, async (req, res) => {
  const id = String(req.body?.id || '').trim();
  if (!id) return res.status(400).json({ success: false, message: 'id required' });

  const allowed = [
    'exam_code',
    'exam_title',
    'exam_date',
    'duration',
    'max_marks',
    'domain',
    'question_text',
    'option_1',
    'option_2',
    'option_3',
    'option_4',
    'correct_answer',
    'marks'
  ];

  const set = {};
  for (const k of allowed) {
    if (req.body?.[k] !== undefined) set[k] = req.body[k];
  }
  if (set.correct_answer !== undefined) set.correct_answer = Number(set.correct_answer);
  if (set.duration !== undefined) set.duration = Number(set.duration);
  if (set.marks !== undefined) set.marks = Number(set.marks);
  if (set.max_marks !== undefined && set.max_marks !== '') set.max_marks = Number(set.max_marks);
  if (set.exam_date !== undefined) set.exam_date = new Date(set.exam_date);

  const updated = await Question.findByIdAndUpdate(id, { $set: set }, { new: true }).lean();
  if (!updated) return res.status(404).json({ success: false, message: 'Question not found' });
  return res.json({ success: true, question: updated });
});
legacyRoutes.post('/edit_student.php', upload, async (req, res) => {
  const id = String(req.body?.id || '').trim();
  const email_id = String(req.body?.email_id || '').trim().toLowerCase();
  if (!id && !email_id) {
    return res.status(400).json({ success: false, message: 'id or email_id required' });
  }
  const allowed = [
    'full_name',
    'phone_number',
    'college_name',
    'course_branch',
    'domain',
    'alt_phone_number',
    'year_of_study',
    'roll_number'
  ];
  const set = {};
  for (const key of allowed) {
    if (req.body?.[key] !== undefined) set[key] = String(req.body[key] ?? '');
  }
  const filter = id ? { _id: id, role: 'student' } : { email_id, role: 'student' };
  const user = await User.findOneAndUpdate(filter, { $set: set }, { new: true })
    .select('-passwordHash')
    .lean();
  if (!user) return res.status(404).json({ success: false, message: 'Student not found' });
  return res.json({ success: true, message: 'Student updated', student: user });
});
legacyRoutes.get('/edit_student.php', (_req, res) => res.redirect(307, '/admin/students/manage'));
legacyRoutes.post('/delete_student.php', upload, async (req, res) => {
  const id = String(req.body?.id || '').trim();
  const email_id = String(req.body?.email_id || '').trim().toLowerCase();
  if (!id && !email_id) {
    return res.status(400).json({ success: false, message: 'id or email_id required' });
  }
  const filter = id ? { _id: id, role: 'student' } : { email_id, role: 'student' };
  const deleted = await User.findOneAndDelete(filter).lean();
  if (!deleted) return res.status(404).json({ success: false, message: 'Student not found' });
  return res.json({ success: true, message: 'Student deleted successfully' });
});
legacyRoutes.get('/delete_student.php', (_req, res) => res.redirect(307, '/admin/students/manage'));

legacyRoutes.post('/add_student.php', upload, createStudent);
legacyRoutes.get('/export_students.php', exportStudentsCsv);
legacyRoutes.get('/view_student.php', async (req, res) => {
  const email_id = String(req.query?.email_id || '').trim().toLowerCase();
  const filter = { role: 'student' };
  if (email_id) filter.email_id = email_id;
  const students = await User.find(filter).select('-passwordHash').sort({ createdAt: -1 }).lean();
  return res.json({ success: true, students });
});
legacyRoutes.post('/send-email.php', upload, submitContact);
legacyRoutes.post('/mail.php', upload, submitContact);
legacyRoutes.post('/submit_student_feedback.php', upload, submitFeedback);
legacyRoutes.post('/evaluate.php', upload, submitExam);
legacyRoutes.get('/evaluate.php', (_req, res) => res.redirect(307, '/student/exam'));
legacyRoutes.post('/get_security_questions.php', upload, (req, res) => {
  req.body = { ...(req.body || {}), email_id: req.body?.email_id || req.body?.email || '' };
  return getSecurityQuestion(req, res);
});
legacyRoutes.get('/get_security_questions.php', (_req, res) => res.redirect(307, '/forgot-password'));
legacyRoutes.post('/apply.php', upload, async (req, res) => {
  const email_id = String(req.body?.email_id || readEmail(req)).trim().toLowerCase();
  if (!email_id) return res.status(400).json({ success: false, message: 'email_id required' });
  const set = {};
  ['internship_selected', 'internship_mode', 'internship_start_date', 'internship_duration_months', 'internship_end_date'].forEach((k) => {
    if (req.body?.[k] !== undefined) set[k] = String(req.body[k] ?? '');
  });
  const updated = await User.findOneAndUpdate({ email_id }, { $set: set }, { new: true })
    .select('-passwordHash')
    .lean();
  if (!updated) return res.status(404).json({ success: false, message: 'User not found' });
  return res.json({ success: true, message: 'Application saved', profile: updated });
});
legacyRoutes.get('/apply.php', (_req, res) => res.redirect(307, '/student/profile'));
legacyRoutes.post('/internship-apply.php', upload, async (req, res) => {
  const email_id = String(req.body?.email_id || req.body?.email || readEmail(req)).trim().toLowerCase();
  if (!email_id) return res.status(400).json({ success: false, message: 'email_id required' });
  const set = {};
  ['internship_selected', 'internship_mode', 'internship_start_date', 'internship_duration_months', 'internship_end_date'].forEach((k) => {
    if (req.body?.[k] !== undefined) set[k] = String(req.body[k] ?? '');
  });
  const updated = await User.findOneAndUpdate({ email_id }, { $set: set }, { new: true })
    .select('-passwordHash')
    .lean();
  if (!updated) return res.status(404).json({ success: false, message: 'User not found' });
  return res.json({ success: true, message: 'Application saved', profile: updated });
});
legacyRoutes.get('/internship-apply.php', (_req, res) => res.redirect(307, '/student/profile'));
legacyRoutes.post('/log_tab_switch.php', upload, async (req, res) => {
  req.body = {
    ...(req.body || {}),
    event_type: req.body?.event_type || 'tab_switch'
  };
  return logTabSwitch(req, res);
});
legacyRoutes.post('/log_ai_violation.php', upload, async (req, res) => {
  req.body = {
    ...(req.body || {}),
    event_type: req.body?.event_type || 'ai_violation',
    note: req.body?.note || 'AI proctoring violation logged'
  };
  return logTabSwitch(req, res);
});

legacyRoutes.get('/guest_exam_validate.php', async (req, res) => {
  req.query = { ...(req.query || {}), exam_code: req.query?.exam_code || '' };
  return validateGuestExamCode(req, res);
});
legacyRoutes.get('/start_exam.php', async (req, res) => {
  req.params = { ...(req.params || {}), examCode: String(req.query?.exam_code || '') };
  return fetchGuestExam(req, res);
});

legacyRoutes.get('/get_student_stats.php', async (req, res) => {
  const email_id = readEmail(req);
  if (!email_id) return res.status(400).json({ success: false, message: 'email_id required' });

  const groups = await Submission.aggregate([
    { $match: { email_id } },
    {
      $group: {
        _id: '$exam_code',
        total_questions: { $sum: 1 },
        correct_answers: { $sum: { $cond: [{ $eq: ['$is_correct', true] }, 1, 0] } },
        obtained_marks: { $sum: '$marks_awarded' },
        max_marks: { $sum: '$question_marks' }
      }
    }
  ]);

  const total_exams_attempted = groups.length;
  const total_questions = groups.reduce((a, g) => a + Number(g.total_questions || 0), 0);
  const total_correct_answers = groups.reduce((a, g) => a + Number(g.correct_answers || 0), 0);
  const obtained_marks = groups.reduce((a, g) => a + Number(g.obtained_marks || 0), 0);
  const max_marks = groups.reduce((a, g) => a + Number(g.max_marks || 0), 0);
  const overall_accuracy = total_questions > 0 ? Number(((total_correct_answers / total_questions) * 100).toFixed(2)) : 0;

  return res.json({
    success: true,
    total_exams_attempted,
    total_questions,
    total_correct_answers,
    obtained_marks,
    max_marks,
    overall_accuracy
  });
});

legacyRoutes.get('/get_teacher_stats.php', async (_req, res) => {
  const [students, examsAgg, questions, submissions] = await Promise.all([
    User.countDocuments({ role: 'student' }),
    Question.aggregate([{ $group: { _id: '$exam_code' } }, { $count: 'total' }]),
    Question.countDocuments({}),
    Submission.countDocuments({})
  ]);
  return res.json({
    success: true,
    stats: {
      total_students: students,
      total_exams: Number(examsAgg?.[0]?.total || 0),
      total_questions: questions,
      total_submissions: submissions
    }
  });
});

const legacyExcelUpload = multer().single('file');
legacyRoutes.post('/upload_excel.php', legacyExcelUpload, async (req, res) => {
  // Practical compatibility: accept CSV uploads via legacy endpoint.
  if (!req.file) return res.status(400).json({ success: false, message: 'Missing file upload (field: file)' });
  const filename = String(req.file.originalname || '').toLowerCase();
  if (!filename.endsWith('.csv')) {
    return res.status(400).json({
      success: false,
      message: 'Only CSV upload is currently supported on this MERN endpoint'
    });
  }

  const text = req.file.buffer.toString('utf8');
  const lines = text
    .split(/\r?\n/)
    .map((x) => x.trim())
    .filter(Boolean);
  if (lines.length < 2) return res.status(400).json({ success: false, message: 'CSV file is empty' });

  const headers = lines[0].split(',').map((h) => h.trim().toLowerCase());
  const idx = (name) => headers.indexOf(name);
  const required = [
    'exam_code',
    'exam_title',
    'exam_date',
    'duration',
    'question_text',
    'option_1',
    'option_2',
    'option_3',
    'option_4',
    'correct_answer'
  ];
  const missing = required.filter((r) => idx(r) < 0);
  if (missing.length) {
    return res.status(400).json({ success: false, message: `Missing required CSV columns: ${missing.join(', ')}` });
  }

  const docs = [];
  for (let i = 1; i < lines.length; i += 1) {
    const cols = lines[i].split(',').map((c) => c.trim());
    const correct = Number(cols[idx('correct_answer')] || 0);
    if (![1, 2, 3, 4].includes(correct)) continue;
    docs.push({
      exam_code: cols[idx('exam_code')],
      exam_title: cols[idx('exam_title')],
      exam_date: new Date(cols[idx('exam_date')]),
      duration: Number(cols[idx('duration')] || 20),
      max_marks: idx('max_marks') >= 0 ? Number(cols[idx('max_marks')] || 0) : null,
      domain: idx('domain') >= 0 ? cols[idx('domain')] : '',
      question_text: cols[idx('question_text')],
      option_1: cols[idx('option_1')],
      option_2: cols[idx('option_2')],
      option_3: cols[idx('option_3')],
      option_4: cols[idx('option_4')],
      correct_answer: correct,
      marks: idx('marks') >= 0 ? Number(cols[idx('marks')] || 0) : 0
    });
  }

  if (!docs.length) {
    return res.status(400).json({ success: false, message: 'No valid rows found in CSV' });
  }
  await Question.insertMany(docs);
  return res.json({ success: true, inserted: docs.length, message: 'CSV imported successfully' });
});

legacyRoutes.get('/get_exam_list.php', async (req, res) => {
  const domain = String(req.query?.domain || '').trim();
  const email_id = String(req.query?.email_id || readEmail(req)).trim().toLowerCase();
  if (!domain) return res.json({ success: true, exams: [] });

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const submittedExamCodes = new Set();
  if (email_id) {
    const subs = await Submission.find({ email_id }, { exam_code: 1 }).lean();
    subs.forEach((s) => submittedExamCodes.add(s.exam_code));
  }

  const questions = await Question.find({ domain, exam_date: { $gte: today } }).lean();
  const byExam = new Map();
  for (const q of questions) {
    if (submittedExamCodes.has(q.exam_code)) continue;
    if (!byExam.has(q.exam_code)) {
      byExam.set(q.exam_code, {
        exam_code: q.exam_code,
        exam_title: q.exam_title,
        exam_date: q.exam_date,
        duration: q.duration
      });
    }
  }
  return res.json({ success: true, exams: Array.from(byExam.values()) });
});

legacyRoutes.get('/get_exam_notifications.php', async (req, res) => {
  const domain = String(req.query?.domain || '').trim();
  if (!domain) return res.json({ success: true, exams: [] });

  const now = new Date();
  const start = new Date(now);
  start.setHours(0, 0, 0, 0);
  const end = new Date(now);
  end.setHours(23, 59, 59, 999);

  const questions = await Question.find({
    domain,
    exam_date: { $gte: start, $lte: end }
  }).lean();
  const byCode = new Map();
  for (const q of questions) {
    if (!byCode.has(q.exam_code)) {
      byCode.set(q.exam_code, {
        exam_code: q.exam_code,
        exam_title: q.exam_title,
        exam_date: q.exam_date,
        duration: q.duration
      });
    }
  }
  return res.json({ success: true, exams: Array.from(byCode.values()) });
});

const chatbotStoreFile = path.resolve(process.cwd(), 'chatbot-responses.json');
legacyRoutes.post('/save_chatbot_responses.php', upload, async (req, res) => {
  const payload = req.body?.responses || req.body?.data || req.body || {};
  let existing = [];
  try {
    existing = fs.existsSync(chatbotStoreFile)
      ? JSON.parse(fs.readFileSync(chatbotStoreFile, 'utf8'))
      : [];
  } catch {
    existing = [];
  }
  const row = {
    at: new Date().toISOString(),
    payload
  };
  existing.push(row);
  fs.writeFileSync(chatbotStoreFile, JSON.stringify(existing, null, 2), 'utf8');
  return res.json({ success: true, message: 'Chatbot responses saved' });
});
legacyRoutes.get('/fetch_chatbot_responses.php', async (_req, res) => {
  try {
    const data = fs.existsSync(chatbotStoreFile)
      ? JSON.parse(fs.readFileSync(chatbotStoreFile, 'utf8'))
      : [];
    return res.json({ success: true, responses: data });
  } catch {
    return res.json({ success: true, responses: [] });
  }
});

const legacySnapshotUpload = multer().single('webcam_snapshot');
legacyRoutes.post('/upload_snapshot.php', legacySnapshotUpload, async (req, res) => {
  const file = req.file;
  if (!file) return res.status(400).json({ success: false, message: 'Missing webcam_snapshot file' });

  const sanitize = (v) =>
    String(v || '')
      .trim()
      .replace(/[^a-zA-Z0-9._-]/g, '_')
      .slice(0, 120);

  const student = sanitize(req.body?.student_name || req.body?.email_id || 'unknown');
  const exam_code = sanitize(req.body?.exam_code || 'unknown');
  const dir = path.join(getSnapshotRootDir(), student, exam_code);
  fs.mkdirSync(dir, { recursive: true });
  const filename = `snapshot_${Date.now()}.jpg`;
  const outPath = path.join(dir, filename);
  fs.writeFileSync(outPath, file.buffer);
  return res.json({ success: true, filename });
});

legacyRoutes.get('/admin_snapshots.php', async (req, res) => {
  const student = String(req.query?.student || '').trim();
  const exam_code = String(req.query?.exam_code || '').trim();
  const root = getSnapshotRootDir();

  if (!student) {
    const students = fs.existsSync(root)
      ? fs.readdirSync(root, { withFileTypes: true }).filter((d) => d.isDirectory()).map((d) => d.name).sort()
      : [];
    return res.json({ success: true, students });
  }

  const studentDir = path.join(root, student);
  if (!exam_code) {
    const exam_codes = fs.existsSync(studentDir)
      ? fs.readdirSync(studentDir, { withFileTypes: true }).filter((d) => d.isDirectory()).map((d) => d.name).sort()
      : [];
    return res.json({ success: true, student, exam_codes });
  }

  const examDir = path.join(studentDir, exam_code);
  const images = fs.existsSync(examDir)
    ? fs
        .readdirSync(examDir, { withFileTypes: true })
        .filter((d) => d.isFile() && /\.(jpg|jpeg|png|gif|webp)$/i.test(d.name))
        .map((d) => ({
          filename: d.name,
          url: `/snapshot-files/${encodeURIComponent(student)}/${encodeURIComponent(exam_code)}/${encodeURIComponent(d.name)}`
        }))
    : [];
  return res.json({ success: true, student, exam_code, images });
});
legacyRoutes.get('/view_exam_snapshots.php', async (req, res) => {
  const student = String(req.query?.student || '').trim();
  const exam_code = String(req.query?.exam_code || '').trim();
  const target = `/admin_snapshots.php?student=${encodeURIComponent(student)}&exam_code=${encodeURIComponent(exam_code)}`;
  return res.redirect(307, target);
});

// -------------------------------
// Legacy results endpoint aliases
// -------------------------------
legacyRoutes.get('/get_result_analysis.php', async (req, res) => {
  const email_id = readEmail(req);
  if (!email_id) return res.status(400).json({ success: false, message: 'email_id required' });

  const examGroups = await Submission.aggregate([
    { $match: { email_id } },
    {
      $group: {
        _id: '$exam_code',
        exam_title: { $first: '$exam_title' },
        total_questions: { $sum: 1 },
        correct_questions: {
          $sum: { $cond: [{ $eq: ['$is_correct', true] }, 1, 0] }
        },
        start_time: { $min: '$submitted_at' },
        end_time: { $max: '$submitted_at' }
      }
    }
  ]);

  if (!examGroups.length) {
    return res.json({
      success: true,
      average_speed: 'N/A',
      overall_accuracy: 'N/A',
      exam_scores: []
    });
  }

  let totalAccuracy = 0;
  let totalQPM = 0;
  const exam_scores = [];
  for (const g of examGroups) {
    const accuracy = g.total_questions > 0 ? (g.correct_questions / g.total_questions) * 100 : 0;
    totalAccuracy += accuracy;
    const start = g.start_time ? new Date(g.start_time).getTime() : null;
    const end = g.end_time ? new Date(g.end_time).getTime() : null;
    let timeTakenSeconds = start && end ? Math.max(0, (end - start) / 1000) : 120;
    if (!start || !end) timeTakenSeconds = 120;
    if (timeTakenSeconds < 30) timeTakenSeconds = 60;
    const minutes = timeTakenSeconds / 60;
    const qpm = minutes > 0 ? g.total_questions / minutes : 0;
    totalQPM += qpm;
    exam_scores.push({
      exam_code: g._id,
      exam_title: g.exam_title || 'Exam',
      accuracy: Number(accuracy.toFixed(2)),
      submitted_at: g.end_time ? new Date(g.end_time).toISOString() : new Date().toISOString(),
      speed_qpm: Number(qpm.toFixed(2))
    });
  }
  exam_scores.sort((a, b) => new Date(a.submitted_at) - new Date(b.submitted_at));

  return res.json({
    success: true,
    average_speed: Number((totalQPM / examGroups.length).toFixed(2)),
    overall_accuracy: Number((totalAccuracy / examGroups.length).toFixed(2)),
    exam_scores
  });
});

legacyRoutes.get('/show_results.php', async (req, res) => {
  const exam_code = String(req.query?.exam_code || '').trim();
  if (!exam_code) return res.status(400).json({ success: false, message: 'exam_code required' });

  const rows = await Submission.aggregate([
    { $match: { exam_code } },
    {
      $group: {
        _id: { email_id: '$email_id', student_name: '$student_name' },
        exam_title: { $first: '$exam_title' },
        email_id: { $first: '$email_id' },
        student_name: { $first: '$student_name' },
        max_marks: { $sum: '$question_marks' },
        obtained_marks: { $sum: '$marks_awarded' }
      }
    },
    { $sort: { obtained_marks: -1 } }
  ]);

  const emails = rows.map((r) => r.email_id);
  const users = await User.find({ role: 'student', email_id: { $in: emails } })
    .select('phone_number college_name email_id')
    .lean();
  const userByEmail = new Map(users.map((u) => [u.email_id, u]));

  return res.json({
    success: true,
    exam_code,
    exam_results: rows.map((r) => {
      const u = userByEmail.get(r.email_id);
      return {
        student_name: r.student_name,
        email_id: r.email_id,
        phone_number: u?.phone_number || '',
        college_name: u?.college_name || '',
        max_marks: r.max_marks,
        obtained_marks: r.obtained_marks,
        exam_title: r.exam_title
      };
    })
  });
});
legacyRoutes.get('/show_result.php', async (req, res) => {
  const exam_code = String(req.query?.exam_code || '').trim();
  const target = exam_code
    ? `/show_results.php?exam_code=${encodeURIComponent(exam_code)}`
    : '/show_results.php';
  return res.redirect(307, target);
});

legacyRoutes.get('/show_student_result.php', async (req, res) => {
  const exam_code = String(req.query?.exam_code || '').trim();
  const email_id = readEmail(req);
  if (!exam_code || !email_id) {
    return res.status(400).json({ success: false, message: 'exam_code and email_id required' });
  }

  const shared = await SharedResult.findOne({ exam_code, email_id, shared: true }).lean();
  if (!shared) return res.status(403).json({ success: false, message: 'Result not shared yet' });

  const groups = await Submission.aggregate([
    { $match: { email_id, exam_code } },
    {
      $group: {
        _id: '$exam_code',
        exam_title: { $first: '$exam_title' },
        student_name: { $first: '$student_name' },
        email_id: { $first: '$email_id' },
        max_marks: { $sum: '$question_marks' },
        obtained_marks: { $sum: '$marks_awarded' }
      }
    }
  ]);

  if (!groups.length) return res.status(404).json({ success: false, message: 'Exam results not found' });
  const g = groups[0];
  return res.json({
    success: true,
    result: {
      exam_code,
      exam_title: g.exam_title,
      student_name: g.student_name,
      email_id: g.email_id,
      max_marks: g.max_marks,
      obtained_marks: g.obtained_marks
    }
  });
});

legacyRoutes.get('/fetch_results.php', async (req, res) => {
  const exam_code = String(req.query?.exam_code || '').trim();
  const email_id = readEmail(req);

  const match = {};
  if (exam_code) match.exam_code = exam_code;
  if (email_id) match.email_id = email_id;

  const rows = await Submission.aggregate([
    { $match: match },
    {
      $group: {
        _id: { exam_code: '$exam_code', email_id: '$email_id' },
        exam_title: { $first: '$exam_title' },
        student_name: { $first: '$student_name' },
        max_marks: { $sum: '$question_marks' },
        obtained_marks: { $sum: '$marks_awarded' },
        submitted_at: { $max: '$submitted_at' }
      }
    },
    { $sort: { submitted_at: -1 } }
  ]);

  return res.json({
    success: true,
    results: rows.map((r) => ({
      exam_code: r._id.exam_code,
      email_id: r._id.email_id,
      exam_title: r.exam_title,
      student_name: r.student_name,
      max_marks: r.max_marks,
      obtained_marks: r.obtained_marks
    }))
  });
});

legacyRoutes.get('/resultdashboard.php', async (_req, res) => {
  const rows = await Submission.aggregate([
    {
      $group: {
        _id: { exam_code: '$exam_code', email_id: '$email_id' },
        exam_title: { $first: '$exam_title' },
        student_name: { $first: '$student_name' },
        submitted_at: { $max: '$submitted_at' }
      }
    },
    { $sort: { submitted_at: -1 } }
  ]);

  return res.json({
    success: true,
    items: rows.map((r) => ({
      exam_code: r._id.exam_code,
      email_id: r._id.email_id,
      exam_title: r.exam_title,
      student_name: r.student_name
    }))
  });
});

legacyRoutes.get('/result_detail.php', async (req, res) => {
  const exam_code = String(req.query?.exam_code || '').trim();
  const email_id = String(req.query?.email_id || readEmail(req)).trim().toLowerCase();
  if (!exam_code || !email_id) {
    return res.status(400).json({ success: false, message: 'exam_code and email_id required' });
  }

  const groups = await Submission.aggregate([
    { $match: { exam_code, email_id } },
    {
      $group: {
        _id: '$exam_code',
        exam_title: { $first: '$exam_title' },
        student_name: { $first: '$student_name' },
        email_id: { $first: '$email_id' },
        max_marks: { $sum: '$question_marks' },
        obtained_marks: { $sum: '$marks_awarded' }
      }
    }
  ]);
  if (!groups.length) return res.status(404).json({ success: false, message: 'Result not found' });
  return res.json({ success: true, result: groups[0] });
});

legacyRoutes.post('/update_Student_stats.php', upload, async (req, res) => {
  // Stats are computed dynamically from submissions in MERN mode.
  return res.json({ success: true, message: 'Student stats are auto-calculated' });
});

legacyRoutes.post('/update_profile_minimal.php', upload, async (req, res) => {
  const email_id = String(req.body?.email_id || readEmail(req)).trim().toLowerCase();
  if (!email_id) return res.status(400).json({ success: false, message: 'email_id required' });
  const set = {};
  ['full_name', 'phone_number', 'college_name', 'course_branch', 'domain'].forEach((k) => {
    if (req.body?.[k] !== undefined) set[k] = String(req.body[k] ?? '');
  });
  const updated = await User.findOneAndUpdate({ email_id }, { $set: set }, { new: true })
    .select('-passwordHash')
    .lean();
  if (!updated) return res.status(404).json({ success: false, message: 'User not found' });
  return res.json({ success: true, profile: updated });
});
legacyRoutes.post('/update_profile_test.php', upload, async (req, res) => {
  const email_id = String(req.body?.email_id || readEmail(req)).trim().toLowerCase();
  if (!email_id) return res.status(400).json({ success: false, message: 'email_id required' });
  const set = {};
  ['full_name', 'phone_number', 'college_name', 'course_branch', 'domain'].forEach((k) => {
    if (req.body?.[k] !== undefined) set[k] = String(req.body[k] ?? '');
  });
  const updated = await User.findOneAndUpdate({ email_id }, { $set: set }, { new: true })
    .select('-passwordHash')
    .lean();
  if (!updated) return res.status(404).json({ success: false, message: 'User not found' });
  return res.json({ success: true, profile: updated });
});

legacyRoutes.post('/share_result.php', upload, async (req, res) => {
  const exam_code = String(req.body?.exam_code || '').trim();
  const email_id = String(req.body?.email_id || '').trim().toLowerCase();
  const shared = String(req.body?.shared || '1').trim();
  if (!exam_code || !email_id) {
    return res.status(400).json({ success: false, message: 'exam_code and email_id required' });
  }

  const shareFlag = !(shared === '0' || shared.toLowerCase() === 'false');
  await SharedResult.findOneAndUpdate(
    { exam_code, email_id },
    { $set: { shared: shareFlag } },
    { upsert: true, new: true }
  );
  return res.json({ success: true, message: shareFlag ? 'Result shared' : 'Result unshared' });
});

legacyRoutes.get('/download_result.php', async (req, res) => {
  const exam_code = String(req.query?.exam_code || '').trim();
  if (!exam_code) return res.status(400).json({ success: false, message: 'exam_code required' });

  const rows = await Submission.aggregate([
    { $match: { exam_code } },
    {
      $group: {
        _id: { email_id: '$email_id', student_name: '$student_name' },
        exam_title: { $first: '$exam_title' },
        email_id: { $first: '$email_id' },
        student_name: { $first: '$student_name' },
        max_marks: { $sum: '$question_marks' },
        obtained_marks: { $sum: '$marks_awarded' }
      }
    },
    { $sort: { obtained_marks: -1 } }
  ]);

  const emails = rows.map((r) => r.email_id);
  const users = await User.find({ role: 'student', email_id: { $in: emails } })
    .select('phone_number alt_phone_number college_name email_id')
    .lean();
  const userByEmail = new Map((users || []).map((u) => [u.email_id, u]));

  const headers = [
    'Name',
    'Email',
    'Phone Number',
    'Mobile Number',
    'College Name',
    'Max Marks',
    'Obtained Marks'
  ];
  const escapeCsv = (v) => {
    const s = String(v ?? '');
    if (s.includes(',') || s.includes('"') || s.includes('\n')) return `"${s.replaceAll('"', '""')}"`;
    return s;
  };

  const lines = [headers.join(',')];
  for (const r of rows) {
    const u = userByEmail.get(r.email_id);
    lines.push(
      [
        r.student_name,
        r.email_id,
        u?.phone_number ?? '',
        u?.alt_phone_number ?? '',
        u?.college_name ?? '',
        r.max_marks,
        r.obtained_marks
      ]
        .map(escapeCsv)
        .join(',')
    );
  }

  const csv = lines.join('\n');
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="exam_results_${exam_code}.csv"`);
  return res.send(csv);
});

