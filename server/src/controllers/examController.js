import { Question } from '../models/Question.js';
import { Submission } from '../models/Submission.js';
import { User } from '../models/User.js';
import { escapeRegex } from '../utils/escapeRegex.js';

/** Flat answers from multipart: answers[id]=n and/or nested body.answers */
function parseAnswersFromBody(body) {
  const answers = {};
  const raw = body || {};
  if (raw.answers && typeof raw.answers === 'object' && !Array.isArray(raw.answers)) {
    for (const [k, v] of Object.entries(raw.answers)) {
      answers[String(k)] = Number(v);
    }
  }
  for (const [k, v] of Object.entries(raw)) {
    const m = k.match(/^answers\[(.+)\]$/);
    if (m) answers[m[1]] = Number(v);
  }
  return answers;
}

function startOfDay(date = new Date()) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

export async function allocateExam(req, res) {
  const { exam_code, domain } = req.body || {};
  if (!exam_code || !domain) {
    return res.status(400).json({ success: false, message: 'exam_code and domain required' });
  }

  const exam_code_input = String(exam_code).trim();
  const domainTrim = String(domain).trim();

  const first = await Question.findOne({
    exam_code: new RegExp(`^${escapeRegex(exam_code_input)}$`, 'i')
  })
    .select('exam_code')
    .lean();
  if (!first?.exam_code) {
    return res.json({
      success: true,
      message: `Success! Updated 0 questions for domain '${domainTrim}'`
    });
  }

  const result = await Question.updateMany(
    { exam_code: first.exam_code },
    { $set: { domain: domainTrim } }
  );

  return res.json({
    success: true,
    message: `Success! Updated ${result.modifiedCount ?? 0} questions for domain '${domainTrim}'`
  });
}

export async function getStudentExams(req, res) {
  const authUser = req.user;
  let domain = String(req.query.domain || authUser?.domain || '').trim();
  if (!domain && authUser?.email) {
    const u = await User.findOne({ email_id: authUser.email }).select('domain').lean();
    domain = String(u?.domain || '').trim();
  }
  if (!domain) {
    return res.json({ success: true, exams: [] });
  }

  const today = startOfDay(new Date());
  const { email_id } = req.query;

  // If student doesn't supply email_id, we won't exclude already submitted exams.
  const submittedExamCodes = new Set();
  if (email_id) {
    const subs = await Submission.find(
      { email_id: String(email_id).trim().toLowerCase(), exam_code: { $ne: null } },
      { exam_code: 1 }
    ).lean();
    subs.forEach((s) => submittedExamCodes.add(s.exam_code));
  }

  const questions = await Question.find({
    domain,
    exam_date: { $gte: today }
  }).lean();

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

  return res.json({ success: true, exams: Array.from(byExam.values()).sort((a, b) => a.exam_date - b.exam_date) });
}

export async function getTodayExamNotifications(req, res) {
  const authUser = req.user;
  const email = authUser?.email;
  if (!email) return res.status(401).json({ success: false, message: 'Not authenticated' });

  let domain = String(authUser?.domain || '').trim();
  if (!domain) {
    const u = await User.findOne({ email_id: email }).select('domain').lean();
    domain = String(u?.domain || '').trim();
  }

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
}

// Fetch exam by exam_code
export async function fetchExam(req, res) {
  const exam_code = String(req.params.examCode || '').trim();
  if (!exam_code) return res.status(400).json({ success: false, message: 'exam_code required' });

  const questions = await Question.find({
    exam_code: new RegExp(`^${escapeRegex(exam_code)}$`, 'i')
  })
    .sort({ createdAt: 1 })
    .lean();
  if (!questions.length) return res.status(404).json({ success: false, message: 'Exam not found' });

  const exam = {
    exam_code: String(questions[0].exam_code || '').trim(),
    exam_title: questions[0].exam_title,
    duration: questions[0].duration
  };

  return res.json({
    success: true,
    exam,
    questions: questions.map((q) => ({
      id: q._id.toString(),
      exam_code: q.exam_code,
      exam_title: q.exam_title,
      duration: q.duration,
      max_marks: q.max_marks ?? null,
      question_text: q.question_text,
      option_1: q.option_1,
      option_2: q.option_2,
      option_3: q.option_3,
      option_4: q.option_4,
      marks: q.marks ?? 0
    }))
  });
}

export async function fetchGuestExam(req, res) {
  const exam_code = String(req.params.examCode || '').trim();
  if (!exam_code) return res.status(400).json({ success: false, message: 'exam_code required' });

  const questions = await Question.find({
    exam_code: new RegExp(`^${escapeRegex(exam_code)}$`, 'i')
  })
    .sort({ createdAt: 1 })
    .lean();
  if (!questions.length) return res.status(404).json({ success: false, message: 'Exam not found' });

  const exam = {
    exam_code: String(questions[0].exam_code || '').trim(),
    exam_title: questions[0].exam_title,
    duration: questions[0].duration
  };

  return res.json({
    success: true,
    exam,
    questions: questions.map((q) => ({
      id: q._id.toString(),
      exam_code: q.exam_code,
      exam_title: q.exam_title,
      duration: q.duration,
      max_marks: q.max_marks ?? null,
      question_text: q.question_text,
      option_1: q.option_1,
      option_2: q.option_2,
      option_3: q.option_3,
      option_4: q.option_4,
      marks: q.marks ?? 0
    }))
  });
}

// Exam submission: expects FormData containing answers[questionId] => 1..4 or 0
export async function submitExam(req, res) {
  const body = req.body || {};
  const exam_code_input = String(body.exam_code || '').trim();
  const email_id = String(body.email_id || '').trim().toLowerCase();
  const student_name = String(body.student_name || '').trim();
  const time_taken_seconds = Number(body.time_taken_seconds || 0) || 0;
  const is_guest_exam = String(body.is_guest_exam || '').toLowerCase() === 'true';

  if (!exam_code_input || !email_id || !student_name) {
    return res.status(400).json({ success: false, message: 'Missing required fields' });
  }

  const questions = await Question.find({
    exam_code: new RegExp(`^${escapeRegex(exam_code_input)}$`, 'i')
  })
    .sort({ createdAt: 1 })
    .lean();
  if (!questions.length) return res.status(404).json({ success: false, message: 'Exam not found' });

  const exam_code = String(questions[0].exam_code || '').trim();

  const existing = await Submission.exists({ exam_code, email_id });
  if (existing) return res.status(409).json({ success: false, message: '❌ You have already submitted this exam.' });

  const answers = parseAnswersFromBody(body);

  const docs = [];
  let maxMarks = 0;
  let obtainedMarks = 0;
  const exam_title = questions[0].exam_title || '';

  for (const q of questions) {
    const selected = Number(answers[q._id.toString()] ?? 0) || 0;
    const isCorrect = selected > 0 && selected === q.correct_answer;
    const marks = Number(q.marks ?? 0) || 0;

    maxMarks += marks;
    if (isCorrect) obtainedMarks += marks;

    docs.push({
      exam_code,
      exam_title,
      email_id,
      student_name,
      is_guest_exam,
      time_taken_seconds,
      question_text: q.question_text,
      answer_selected: selected,
      correct_answer: q.correct_answer,
      is_correct: isCorrect,
      question_marks: marks,
      marks_awarded: isCorrect ? marks : 0
    });
  }

  await Submission.insertMany(docs);
  return res.json({ success: true, message: 'Exam submitted successfully.', max_marks: maxMarks, obtained_marks: obtainedMarks });
}

// Guest exam code check parity (legacy guest_exam_validate.php)
export async function validateGuestExamCode(req, res) {
  const exam_code = String(req.body?.exam_code || req.query?.exam_code || '').trim();
  if (!exam_code) return res.status(400).json({ success: false, message: 'exam_code is required' });

  const first = await Question.findOne({
    exam_code: new RegExp(`^${escapeRegex(exam_code)}$`, 'i')
  })
    .select('exam_code exam_title exam_date duration')
    .lean();
  if (!first) return res.status(404).json({ success: false, message: 'Invalid exam code' });

  return res.json({
    success: true,
    exam: {
      exam_code: first.exam_code,
      exam_title: first.exam_title,
      exam_date: first.exam_date,
      duration: first.duration
    }
  });
}

