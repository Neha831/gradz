/** Base path for the admin React app (dashboard, exams, etc.) */
export const ADMIN_BASE = '/admin';

/**
 * Client-side route under the admin area (not API paths).
 * @param {string} [subpath] e.g. "questions/setup" → "/admin/questions/setup"
 */
export function adminRoute(subpath = '') {
  const s = String(subpath || '').replace(/^\/+/, '');
  return s ? `${ADMIN_BASE}/${s}` : ADMIN_BASE;
}
