import { User } from '../models/User.js';
import { Question } from '../models/Question.js';
import { Submission } from '../models/Submission.js';

export async function getDashboardStats(_req, res) {
  const [students, examsAgg, questionCount, submissionCount] = await Promise.all([
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
      total_questions: questionCount,
      total_submissions: submissionCount
    }
  });
}

