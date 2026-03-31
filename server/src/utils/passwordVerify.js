import crypto from 'crypto';
import bcrypt from 'bcryptjs';

/** bcrypt hashes from PHP password_hash / Node bcrypt */
export function isBcryptHash(s) {
  return typeof s === 'string' && /^\$2[aby]\$\d{2}\$/.test(s);
}

/** 32-char hex — common legacy PHP `md5($password)` in MySQL */
export function isMd5Hex(s) {
  return typeof s === 'string' && /^[a-f0-9]{32}$/i.test(String(s).trim());
}

export function md5Hex(plain) {
  return crypto.createHash('md5').update(String(plain), 'utf8').digest('hex');
}

/**
 * Match plain password against stored hash (bcrypt or legacy MD5 hex).
 * Used for users migrated from MySQL where `passwordHash` was copied as-is.
 */
export async function verifyPasswordAgainstStored(plain, stored) {
  if (stored == null || stored === '') return false;
  const s = String(stored).trim();

  if (isBcryptHash(s)) {
    return bcrypt.compare(String(plain), s);
  }

  if (isMd5Hex(s)) {
    return md5Hex(plain).toLowerCase() === s.toLowerCase();
  }

  try {
    return await bcrypt.compare(String(plain), s);
  } catch {
    return false;
  }
}

export async function hashPasswordBcrypt(plain) {
  return bcrypt.hash(String(plain), 10);
}
