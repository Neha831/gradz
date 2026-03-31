export function requireRole(roles = []) {
  return function roleGuard(req, res, next) {
    const user = req.user;
    if (!user?.role) return res.status(403).json({ success: false, message: 'Forbidden' });
    if (!roles.includes(user.role)) return res.status(403).json({ success: false, message: 'Forbidden' });
    return next();
  };
}

