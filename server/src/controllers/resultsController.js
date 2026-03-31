import { Submission } from '../models/Submission.js';
import { User } from '../models/User.js';
import { SharedResult } from '../models/SharedResult.js';
import { escapeRegex } from '../utils/escapeRegex.js';
import { examCodeMatchFilter, resolveCanonicalExamCode } from '../utils/examCodeResolve.js';

export async function adminExamResults(req, res) {
  const exam_code = String(req.query.exam_code || '').trim();
  if (!exam_code) return res.status(400).json({ success: false, message: 'exam_code is required' });

  const rows = await Submission.aggregate([
    { $match: examCodeMatchFilter(exam_code) },
    {
      $group: {
        _id: '$email_id',
        exam_title: { $first: '$exam_title' },
        email_id: { $first: '$email_id' },
        student_name: { $first: '$student_name' },
        max_marks: { $sum: { $ifNull: ['$question_marks', 0] } },
        obtained_marks: { $sum: { $ifNull: ['$marks_awarded', 0] } }
      }
    },
    { $sort: { obtained_marks: -1 } }
  ]);

  const exam_code_canon = (await resolveCanonicalExamCode(exam_code)) || exam_code;

  const emails = rows.map((r) => r.email_id);
  const users = await User.find({ role: 'student', email_id: { $in: emails } }).select('phone_number college_name email_id').lean();
  const userByEmail = new Map((users || []).map((u) => [u.email_id, u]));
  const sharedRows = await SharedResult.find({
    email_id: { $in: emails },
    exam_code: new RegExp(`^${escapeRegex(exam_code)}$`, 'i')
  }).lean();
  const sharedByEmail = new Map(sharedRows.map((s) => [s.email_id, !!s.shared]));

  return res.json({
    success: true,
    exam_code: exam_code_canon,
    exam_results: rows.map((r) => {
      const u = userByEmail.get(r.email_id);
      return {
        student_name: r.student_name,
        email_id: r.email_id,
        phone_number: u?.phone_number ?? '',
        college_name: u?.college_name ?? '',
        max_marks: Number(r.max_marks) || 0,
        obtained_marks: Number(r.obtained_marks) || 0,
        exam_title: r.exam_title,
        shared: sharedByEmail.get(r.email_id) || false
      };
    })
  });
}

export async function studentResultsAnalysis(req, res) {
  const email = String(req.user?.email || '').trim().toLowerCase();
  if (!email) return res.status(401).json({ success: false, message: 'Not authenticated' });

  const examGroups = await Submission.aggregate([
    { $match: { email_id: email } },
    {
      $group: {
        _id: '$exam_code',
        exam_title: { $first: '$exam_title' },
        total_questions: { $sum: 1 },
        correct_questions: {
          $sum: {
            $cond: [{ $eq: ['$is_correct', true] }, 1, 0]
          }
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
  const examCount = examGroups.length;
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
    average_speed: Number((totalQPM / examCount).toFixed(2)),
    overall_accuracy: Number((totalAccuracy / examCount).toFixed(2)),
    exam_scores
  });
}

export async function studentExamsList(req, res) {
  const email = String(req.user?.email || '').trim().toLowerCase();
  if (!email) return res.status(401).json({ success: false, message: 'Not authenticated' });

  const shared = await SharedResult.find({ email_id: email, shared: true }).lean();
  const sharedCodes = Array.from(new Set(shared.map((s) => s.exam_code)));
  if (!sharedCodes.length) return res.json({ success: true, exams: [] });

  const groups = await Submission.aggregate([
    { $match: { email_id: email, exam_code: { $in: sharedCodes } } },
    {
      $group: {
        _id: '$exam_code',
        exam_title: { $first: '$exam_title' },
        max_marks: { $sum: { $ifNull: ['$question_marks', 0] } },
        obtained_marks: { $sum: { $ifNull: ['$marks_awarded', 0] } },
        submitted_at: { $max: '$submitted_at' }
      }
    },
    { $sort: { submitted_at: -1 } }
  ]);

  return res.json({
    success: true,
    exams: groups.map((g) => ({
      exam_code: g._id,
      exam_title: g.exam_title,
      max_marks: g.max_marks,
      obtained_marks: g.obtained_marks
    }))
  });
}

export async function studentExamDetail(req, res) {
  const email = String(req.user?.email || '').trim().toLowerCase();
  if (!email) return res.status(401).json({ success: false, message: 'Not authenticated' });

  const exam_code_input = String(req.params.examCode || '').trim();
  if (!exam_code_input) return res.status(400).json({ success: false, message: 'examCode is required' });

  const access = await SharedResult.findOne({
    email_id: email,
    shared: true,
    exam_code: new RegExp(`^${escapeRegex(exam_code_input)}$`, 'i')
  }).lean();
  if (!access) return res.status(403).json({ success: false, message: 'Result not shared yet' });

  const groups = await Submission.aggregate([
    { $match: { email_id: email, ...examCodeMatchFilter(exam_code_input) } },
    {
      $group: {
        _id: '$exam_code',
        exam_title: { $first: '$exam_title' },
        student_name: { $first: '$student_name' },
        email_id: { $first: '$email_id' },
        max_marks: { $sum: { $ifNull: ['$question_marks', 0] } },
        obtained_marks: { $sum: { $ifNull: ['$marks_awarded', 0] } }
      }
    }
  ]);

  if (!groups.length) return res.status(404).json({ success: false, message: 'Exam results not found' });
  const g = groups[0];
  const exam_code = g._id;

  return res.json({
    success: true,
    result: {
      exam_code,
      exam_title: g.exam_title,
      student_name: g.student_name,
      email_id: g.email_id,
      max_marks: Number(g.max_marks) || 0,
      obtained_marks: Number(g.obtained_marks) || 0
    }
  });
}

export async function shareSingleResult(req, res) {
  const exam_code_input = String(req.body?.exam_code || '').trim();
  const email_id = String(req.body?.email_id || '').trim().toLowerCase();
  const shared = !!req.body?.shared;
  if (!exam_code_input || !email_id) {
    return res.status(400).json({ success: false, message: 'exam_code and email_id are required' });
  }

  const exam_code = await resolveCanonicalExamCode(exam_code_input);

  await SharedResult.findOneAndUpdate(
    { exam_code, email_id },
    { $set: { shared } },
    { upsert: true, new: true }
  );

  return res.json({ success: true, message: shared ? 'Result shared' : 'Result unshared' });
}

export async function shareAllResults(req, res) {
  const exam_code_input = String(req.body?.exam_code || '').trim();
  const shared = !!req.body?.shared;
  if (!exam_code_input) return res.status(400).json({ success: false, message: 'exam_code is required' });

  const exam_code = await resolveCanonicalExamCode(exam_code_input);

  const students = await Submission.aggregate([
    { $match: examCodeMatchFilter(exam_code_input) },
    { $group: { _id: '$email_id' } }
  ]);

  const ops = students.map((s) => ({
    updateOne: {
      filter: { exam_code, email_id: s._id },
      update: { $set: { shared } },
      upsert: true
    }
  }));
  if (ops.length) await SharedResult.bulkWrite(ops);

  return res.json({
    success: true,
    message: shared
      ? `Shared all results for ${exam_code}`
      : `Unshared all results for ${exam_code}`
  });
}

export async function exportExamResultsCsv(req, res) {
  const exam_code = String(req.query.exam_code || '').trim();
  if (!exam_code) return res.status(400).json({ success: false, message: 'exam_code is required' });

  const rows = await Submission.aggregate([
    { $match: examCodeMatchFilter(exam_code) },
    {
      $group: {
        _id: '$email_id',
        exam_title: { $first: '$exam_title' },
        email_id: { $first: '$email_id' },
        student_name: { $first: '$student_name' },
        max_marks: { $sum: { $ifNull: ['$question_marks', 0] } },
        obtained_marks: { $sum: { $ifNull: ['$marks_awarded', 0] } }
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
    if (s.includes(',') || s.includes('"') || s.includes('\n')) {
      return `"${s.replaceAll('"', '""')}"`;
    }
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
}

export async function deleteAllExamResults(req, res) {
  const exam_code = String(req.body?.exam_code || '').trim();
  if (!exam_code) return res.status(400).json({ success: false, message: 'exam_code is required' });

  const deleted = await Submission.deleteMany(examCodeMatchFilter(exam_code));
  await SharedResult.deleteMany(examCodeMatchFilter(exam_code));

  return res.json({
    success: true,
    message: `Deleted ${deleted.deletedCount || 0} submission rows for exam ${exam_code}`
  });
}

