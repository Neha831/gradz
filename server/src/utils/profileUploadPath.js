/** Must match multer destination folder segment (safe for filesystem paths). */
export function profileDirSegmentFromEmail(email) {
  return String(email || 'unknown').replace(/[^a-zA-Z0-9._-]/g, '_');
}

/**
 * Older API responses used encodeURIComponent(email) in the path; files on disk always used
 * profileDirSegmentFromEmail. Rewrite stored URLs so existing uploads keep working.
 */
export function fixLegacyProfileUploadUrl(url, emailId) {
  const u = String(url || '').trim();
  const id = String(emailId || '').trim().toLowerCase();
  if (!u || !id) return u;
  const legacySeg = encodeURIComponent(id);
  const dirSeg = profileDirSegmentFromEmail(id);
  if (legacySeg === dirSeg) return u;
  const needle = `/profiles/${legacySeg}/`;
  if (!u.includes(needle)) return u;
  return u.split(needle).join(`/profiles/${dirSeg}/`);
}
