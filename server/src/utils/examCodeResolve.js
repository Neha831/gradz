import { Question } from '../models/Question.js';
import { Submission } from '../models/Submission.js';
import { escapeRegex } from './escapeRegex.js';

/** Mongo filter: match exam_code case-insensitively (anchored). */
export function examCodeMatchFilter(exam_code) {
  return { exam_code: new RegExp(`^${escapeRegex(exam_code)}$`, 'i') };
}

/**
 * Prefer Submission row, then Question bank; else return trimmed input.
 */
export async function resolveCanonicalExamCode(exam_code_input) {
  const raw = String(exam_code_input || '').trim();
  if (!raw) return '';
  const s = await Submission.findOne(examCodeMatchFilter(raw)).select('exam_code').lean();
  if (s?.exam_code) return s.exam_code;
  const q = await Question.findOne(examCodeMatchFilter(raw)).select('exam_code').lean();
  if (q?.exam_code) return q.exam_code;
  return raw;
}
