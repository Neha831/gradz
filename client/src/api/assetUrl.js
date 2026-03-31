/**
 * Origin used to load `/uploads/...` (same host as the API, not under `/api`).
 * - Absolute `VITE_API_BASE` like `http://localhost:5000/api` → `http://localhost:5000`
 * - Relative `/api` (same-origin API) → `window.location.origin` (dev: Vite must proxy `/uploads` → API)
 */
export function getApiOrigin() {
  const raw = import.meta.env.VITE_API_BASE ?? 'http://localhost:5000/api';
  const base = String(raw).trim().replace(/\/+$/, '');
  if (!base) {
    return typeof window !== 'undefined' ? window.location.origin : '';
  }
  if (/^https?:\/\//i.test(base)) {
    if (base.endsWith('/api')) {
      const without = base.slice(0, -4);
      return without || base;
    }
    return base;
  }
  // Relative e.g. `/api` — SPA and uploads share the site origin (Express or Vite+proxy)
  if (base === '/api' || base.endsWith('/api')) {
    return typeof window !== 'undefined' ? window.location.origin : '';
  }
  return typeof window !== 'undefined' ? window.location.origin : '';
}

/** Turn `/uploads/...` into a full URL when the SPA runs on another origin (e.g. Vite :5173). */
export function resolveUploadUrl(path) {
  if (!path) return '';
  if (/^https?:\/\//i.test(path)) return path;
  const origin = getApiOrigin();
  const p = path.startsWith('/') ? path : `/${path}`;
  if (!origin) return p;
  return `${origin}${p}`;
}
