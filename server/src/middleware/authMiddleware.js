import jwt from 'jsonwebtoken';

export function requireAuth(req, res, next) {
  const auth = req.headers.authorization || '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : '';
  if (!token) return res.status(401).json({ success: false, message: 'Missing token' });

  try {
    const secret = process.env.JWT_SECRET;
    if (!secret) throw new Error('Missing JWT_SECRET');

    const decoded = jwt.verify(token, secret);
    req.user = decoded; // { sub, email, role }
    return next();
  } catch {
    return res.status(401).json({ success: false, message: 'Invalid token' });
  }
}

