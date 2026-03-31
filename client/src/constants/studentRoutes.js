/** Base path for the student React app (dashboard, exams, etc.) */
export const STUDENT_BASE = '/student';

/**
 * Client-side route under the student area (not API paths).
 * @param {string} [subpath] e.g. "results" → "/student/results"
 */
export function studentRoute(subpath = '') {
  const s = String(subpath || '').replace(/^\/+/, '');
  return s ? `${STUDENT_BASE}/${s}` : STUDENT_BASE;
}
