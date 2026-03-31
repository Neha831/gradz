import { StudentFeedback } from '../models/StudentFeedback.js';
import { resolveCanonicalExamCode } from '../utils/examCodeResolve.js';

export async function submitFeedback(req, res) {
  const b = req.body || {};
  const student_name = String(b.student_name || '').trim();
  const email_id = String(b.email_id || '').trim().toLowerCase();
  const exam_code = await resolveCanonicalExamCode(String(b.exam_code || '').trim());

  const q1_experience = String(b.q1_experience || '').trim();
  const q2_ui = String(b.q2_ui || '').trim();
  const q3_technical = String(b.q3_technical || '').trim();
  const q4_proctoring = String(b.q4_proctoring || '').trim();

  const missing = [];
  if (!student_name) missing.push('student_name');
  if (!email_id) missing.push('email_id');
  if (!exam_code) missing.push('exam_code');
  if (!q1_experience) missing.push('q1_experience');
  if (!q2_ui) missing.push('q2_ui');
  if (!q3_technical) missing.push('q3_technical');
  if (!q4_proctoring) missing.push('q4_proctoring');

  if (missing.length) {
    return res.status(400).json({ success: false, message: 'Missing: ' + missing.join(', ') });
  }

  const is_guest_exam = String(b.is_guest_exam || '').toLowerCase() === 'true';

  await StudentFeedback.create({
    student_name,
    email_id,
    exam_code,
    q1_experience,
    q2_ui,
    q3_technical,
    q4_proctoring,
    is_guest_exam
  });

  return res.json({ success: true });
}

