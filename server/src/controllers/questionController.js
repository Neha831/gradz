import xlsx from 'xlsx';
import { Question } from '../models/Question.js';
import { escapeRegex } from '../utils/escapeRegex.js';

function normKey(k) {
  return String(k || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '_');
}

function pick(row, ...names) {
  const map = new Map();
  for (const k of Object.keys(row)) {
    map.set(normKey(k), row[k]);
  }
  for (const n of names) {
    const v = map.get(normKey(n));
    if (v !== undefined && v !== null && String(v).trim() !== '') return v;
  }
  return '';
}

function parseExcelQuestions(rows) {
  const out = [];
  for (const row of rows) {
    if (!row || typeof row !== 'object') continue;
    const question_text = String(
      pick(row, 'question_text', 'question', 'questions', 'question_text_')
    ).trim();
    const option_1 = String(pick(row, 'option_1', 'option1', 'a', 'opt1')).trim();
    const option_2 = String(pick(row, 'option_2', 'option2', 'b', 'opt2')).trim();
    const option_3 = String(pick(row, 'option_3', 'option3', 'c', 'opt3')).trim();
    const option_4 = String(pick(row, 'option_4', 'option4', 'd', 'opt4')).trim();
    let correct = pick(row, 'correct_answer', 'correct', 'answer', 'ans');
    correct = Number(correct);
    const marks = Number(pick(row, 'marks', 'mark') || 1);
    if (!question_text || !option_1 || !option_2 || !option_3 || !option_4) continue;
    if (![1, 2, 3, 4].includes(correct)) continue;
    out.push({
      question_text,
      option_1,
      option_2,
      option_3,
      option_4,
      correct_answer: correct,
      marks: Number.isFinite(marks) ? marks : 1
    });
  }
  return out;
}

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export async function listExamsOverview(req, res) {
  const rows = await Question.aggregate([
    {
      $group: {
        _id: '$exam_code',
        exam_title: { $first: '$exam_title' },
        exam_date: { $first: '$exam_date' },
        duration: { $first: '$duration' }
      }
    },
    { $sort: { exam_date: -1 } },
    {
      $project: {
        _id: 0,
        exam_code: '$_id',
        exam_title: 1,
        exam_date: 1,
        duration: 1
      }
    }
  ]);
  return res.json({ success: true, exams: rows });
}

export async function uploadQuestionsExcel(req, res) {
  try {
    const exam_code = String(req.body?.exam_code || '').trim();
    const exam_title = String(req.body?.exam_title || '').trim();
    const exam_date = req.body?.exam_date;
    const duration = Number(req.body?.duration);
    const max_marks = req.body?.max_marks === '' || req.body?.max_marks === undefined
      ? null
      : Number(req.body.max_marks);
    const domain = String(req.body?.domain || '').trim();
    const questions_to_show = req.body?.questions_to_show
      ? Number(req.body.questions_to_show)
      : null;

    if (!exam_code || !exam_title || !exam_date) {
      return res.status(400).json({ success: false, message: 'exam_code, exam_title, and exam_date are required' });
    }
    if (!Number.isFinite(duration) || duration < 1 || duration > 600) {
      return res.status(400).json({ success: false, message: 'duration must be 1-600 minutes' });
    }

    const file = req.file;
    if (!file?.buffer) {
      return res.status(400).json({ success: false, message: 'Excel file is required' });
    }

    const wb = xlsx.read(file.buffer, { type: 'buffer' });
    const sheetName = wb.SheetNames[0];
    const sheet = wb.Sheets[sheetName];
    const rows = xlsx.utils.sheet_to_json(sheet);
    let questions = parseExcelQuestions(rows);
    if (!questions.length) {
      return res.status(400).json({
        success: false,
        message:
          'No valid question rows found. Use columns: question_text, option_1..option_4, correct_answer (1-4), marks (optional).'
      });
    }

    if (questions_to_show && questions_to_show > 0 && questions.length > questions_to_show) {
      questions = shuffle(questions).slice(0, questions_to_show);
    }

    const examDate = new Date(exam_date);
    if (Number.isNaN(examDate.getTime())) {
      return res.status(400).json({ success: false, message: 'Invalid exam_date' });
    }

    const docs = questions.map((q) => ({
      exam_code,
      exam_title,
      exam_date: examDate,
      duration,
      max_marks,
      domain,
      question_text: q.question_text,
      option_1: q.option_1,
      option_2: q.option_2,
      option_3: q.option_3,
      option_4: q.option_4,
      correct_answer: q.correct_answer,
      marks: q.marks
    }));

    await Question.insertMany(docs);
    return res.json({ success: true, message: 'Questions uploaded', inserted: docs.length });
  } catch (err) {
    return res.status(500).json({ success: false, message: err?.message || 'Upload failed' });
  }
}

export async function getQuestions(req, res) {
  const exam_code = req.query.exam_code ? String(req.query.exam_code).trim() : undefined;
  const domain = req.query.domain ? String(req.query.domain) : undefined;

  const filter = {};
  if (exam_code) {
    filter.exam_code = new RegExp(`^${escapeRegex(exam_code)}$`, 'i');
  }
  if (domain) filter.domain = domain;

  const questions = await Question.find(filter).lean();
  return res.json({ success: true, questions });
}

export async function createExamQuestions(req, res) {
  const {
    exam_code,
    exam_title,
    exam_date,
    duration,
    max_marks,
    domain = '',
    questions
  } = req.body || {};

  if (!exam_code || !exam_title || !exam_date || !duration) {
    return res.status(400).json({ success: false, message: 'Missing required exam fields' });
  }
  if (!Array.isArray(questions) || questions.length === 0) {
    return res.status(400).json({ success: false, message: 'Questions array required' });
  }

  const docs = [];
  for (const q of questions) {
    if (!q?.question_text || !q?.option_1 || !q?.option_2 || !q?.option_3 || !q?.option_4) continue;
    const correct = Number(q.correct_answer);
    if (![1, 2, 3, 4].includes(correct)) continue;

    docs.push({
      exam_code: String(exam_code).trim(),
      exam_title: String(exam_title).trim(),
      exam_date: new Date(exam_date),
      duration: Number(duration),
      max_marks: max_marks ?? null,
      domain: String(domain || ''),
      question_text: String(q.question_text),
      option_1: String(q.option_1),
      option_2: String(q.option_2),
      option_3: String(q.option_3),
      option_4: String(q.option_4),
      correct_answer: correct,
      marks: q.marks ?? 0
    });
  }

  if (docs.length === 0) {
    return res.status(400).json({ success: false, message: 'No valid questions to insert' });
  }

  await Question.insertMany(docs);
  return res.json({ success: true, message: 'Exam questions saved', inserted: docs.length });
}

export async function createQuestion(req, res) {
  const {
    exam_code,
    exam_title,
    exam_date,
    duration,
    max_marks,
    domain = '',
    question_text,
    option_1,
    option_2,
    option_3,
    option_4,
    correct_answer,
    marks
  } = req.body || {};

  const required = ['exam_code', 'exam_title', 'exam_date', 'duration', 'question_text', 'option_1', 'option_2', 'option_3', 'option_4', 'correct_answer'];
  for (const k of required) {
    if (!req.body?.[k]) {
      return res.status(400).json({ success: false, message: `Missing ${k}` });
    }
  }

  const doc = await Question.create({
    exam_code: String(exam_code).trim(),
    exam_title: String(exam_title).trim(),
    exam_date: new Date(exam_date),
    duration: Number(duration),
    max_marks: max_marks ?? null,
    domain: String(domain || ''),
    question_text: String(question_text),
    option_1: String(option_1),
    option_2: String(option_2),
    option_3: String(option_3),
    option_4: String(option_4),
    correct_answer: Number(correct_answer),
    marks: marks ?? 0
  });

  return res.json({ success: true, question: doc });
}

export async function deleteQuestion(req, res) {
  const { id } = req.params;
  const result = await Question.findByIdAndDelete(id);
  if (!result) return res.status(404).json({ success: false, message: 'Question not found' });
  return res.json({ success: true });
}

export async function deleteQuestionsByExamCode(req, res) {
  const exam_code_input = String(req.body?.exam_code || '').trim();
  if (!exam_code_input) return res.status(400).json({ success: false, message: 'exam_code is required' });

  const first = await Question.findOne({
    exam_code: new RegExp(`^${escapeRegex(exam_code_input)}$`, 'i')
  })
    .select('exam_code')
    .lean();
  if (!first?.exam_code) {
    return res.json({
      success: true,
      message: `Deleted 0 questions from exam ${exam_code_input}`
    });
  }

  const deleted = await Question.deleteMany({ exam_code: first.exam_code });
  return res.json({
    success: true,
    message: `Deleted ${deleted.deletedCount || 0} questions from exam ${first.exam_code}`
  });
}

export async function deleteMultipleExamCodes(req, res) {
  const exam_codes = Array.isArray(req.body?.exam_codes)
    ? req.body.exam_codes.map((x) => String(x || '').trim()).filter(Boolean)
    : [];
  if (!exam_codes.length) {
    return res.status(400).json({ success: false, message: 'exam_codes array is required' });
  }

  const or = exam_codes.map((c) => ({
    exam_code: new RegExp(`^${escapeRegex(c)}$`, 'i')
  }));
  const deleted = await Question.deleteMany({ $or: or });
  return res.json({
    success: true,
    message: `Deleted ${deleted.deletedCount || 0} questions from ${exam_codes.length} exam code(s)`
  });
}

/** Removes every question row (all exam codes). Does not delete submissions or users. */
export async function deleteAllQuestions(req, res) {
  const deleted = await Question.deleteMany({});
  return res.json({
    success: true,
    message: `Deleted ${deleted.deletedCount || 0} question(s).`,
    deletedCount: deleted.deletedCount || 0
  });
}

