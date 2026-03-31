import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { User } from '../models/User.js';
import {
  hashPasswordBcrypt,
  isMd5Hex,
  verifyPasswordAgainstStored
} from '../utils/passwordVerify.js';

const DIRECT_ADMIN_EMAIL = 'admin@gradezy.com';
const DIRECT_ADMIN_PASSWORD = 'Admin@123';
const DIRECT_ADMIN_NAME = 'System Admin';

function signToken(user) {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error('Missing JWT_SECRET');

  return jwt.sign(
    {
      sub: user._id.toString(),
      email: user.email_id,
      role: user.role,
      full_name: user.full_name || '',
      domain: user.domain || ''
    },
    secret,
    { expiresIn: '7d' }
  );
}

async function ensureDirectAdminUser() {
  let admin = await User.findOne({ email_id: DIRECT_ADMIN_EMAIL, role: 'admin' });
  if (admin) return admin;

  const passwordHash = await bcrypt.hash(DIRECT_ADMIN_PASSWORD, 10);
  admin = await User.create({
    role: 'admin',
    email_id: DIRECT_ADMIN_EMAIL,
    passwordHash,
    full_name: DIRECT_ADMIN_NAME
  });
  return admin;
}

export async function register(req, res) {
  const {
    role,
    full_name,
    email_id,
    password,
    phone_number,
    college_name,
    course_branch,
    domain,
    security_question,
    security_answer
  } = req.body || {};

  if (!role || !['admin', 'student'].includes(role)) {
    return res.status(400).json({ success: false, message: 'Invalid role' });
  }
  if (!email_id || !password || password.length < 6) {
    return res.status(400).json({ success: false, message: 'Email and valid password required' });
  }

  const email = String(email_id).trim().toLowerCase();
  if (await User.findOne({ email_id: email })) {
    return res.status(409).json({ success: false, message: 'Email already exists' });
  }

  const passwordHash = await bcrypt.hash(String(password), 10);

  let user;
  try {
    user = await User.create({
      role,
      email_id: email,
      passwordHash,
      full_name: full_name ? String(full_name) : '',
      phone_number: phone_number ? String(phone_number) : '',
      college_name: college_name ? String(college_name) : '',
      course_branch: course_branch ? String(course_branch) : '',
      domain: domain ? String(domain) : '',
      security_question: security_question ? String(security_question) : '',
      security_answer: security_answer ? String(security_answer) : ''
    });
  } catch (e) {
    return res.status(400).json({ success: false, message: e?.message || 'Registration failed' });
  }

  try {
    return res.json({ success: true, message: 'Registered successfully', token: signToken(user) });
  } catch (e) {
    const msg = e?.message || 'Registration failed';
    if (String(msg).includes('JWT_SECRET')) {
      return res.status(500).json({
        success: false,
        message: 'Server misconfiguration: set JWT_SECRET in server/.env'
      });
    }
    return res.status(500).json({ success: false, message: msg });
  }
}

export async function login(req, res) {
  try {
    const { role, email_id, password } = req.body || {};

    if (role && !['admin', 'student'].includes(role)) {
      return res.status(400).json({ success: false, message: 'Invalid role' });
    }
    if (!email_id || !password) {
      return res.status(400).json({ success: false, message: 'Email and password required' });
    }

    const email = String(email_id).trim().toLowerCase();

    // Direct dev admin — always works if password matches (ignore ?role= from client).
    if (email === DIRECT_ADMIN_EMAIL && String(password) === DIRECT_ADMIN_PASSWORD) {
      const adminUser = await ensureDirectAdminUser();
      return res.json({
        success: true,
        token: signToken(adminUser),
        user: { id: adminUser._id.toString(), email_id: adminUser.email_id, role: adminUser.role }
      });
    }

    // Look up by email only so /login?role=student does not block a student account, etc.
    const user = await User.findOne({ email_id: email });
    if (!user) return res.status(401).json({ success: false, message: 'Invalid credentials' });

    const ok = await verifyPasswordAgainstStored(password, user.passwordHash);
    if (!ok) return res.status(401).json({ success: false, message: 'Invalid credentials' });

    // Legacy MySQL MD5 → bcrypt so future logins use one path (see migrate-mysql-to-mongo.js).
    if (isMd5Hex(user.passwordHash)) {
      user.passwordHash = await hashPasswordBcrypt(password);
      await user.save();
    }

    return res.json({
      success: true,
      token: signToken(user),
      user: { id: user._id.toString(), email_id: user.email_id, role: user.role }
    });
  } catch (e) {
    const msg = e?.message || 'Login failed';
    if (String(msg).includes('JWT_SECRET')) {
      return res.status(500).json({
        success: false,
        message: 'Server misconfiguration: set JWT_SECRET in server/.env'
      });
    }
    return res.status(500).json({ success: false, message: msg });
  }
}

export async function getSecurityQuestion(req, res) {
  const email = String(req.body?.email_id || '').trim().toLowerCase();
  const role = String(req.body?.role || '').trim();
  if (!email) return res.status(400).json({ success: false, message: 'email_id is required' });

  const filter = { email_id: email };
  if (role && ['admin', 'student'].includes(role)) filter.role = role;

  const user = await User.findOne(filter).select('security_question').lean();
  if (!user) return res.status(404).json({ success: false, message: 'User not found' });
  if (!user.security_question) {
    return res.status(404).json({ success: false, message: 'Security question not set for this user' });
  }

  return res.json({ success: true, security_question: user.security_question });
}

export async function resetPasswordBySecurityAnswer(req, res) {
  const email = String(req.body?.email_id || '').trim().toLowerCase();
  const role = String(req.body?.role || '').trim();
  const securityAnswer = String(req.body?.security_answer || '').trim();
  const newPassword = String(req.body?.new_password || '');

  if (!email || !securityAnswer || !newPassword) {
    return res.status(400).json({ success: false, message: 'email_id, security_answer and new_password are required' });
  }
  if (newPassword.length < 6) {
    return res.status(400).json({ success: false, message: 'Password must be at least 6 characters' });
  }

  const filter = { email_id: email };
  if (role && ['admin', 'student'].includes(role)) filter.role = role;

  const user = await User.findOne(filter);
  if (!user) return res.status(404).json({ success: false, message: 'User not found' });

  const expected = String(user.security_answer || '').trim().toLowerCase();
  if (!expected || expected !== securityAnswer.toLowerCase()) {
    return res.status(401).json({ success: false, message: 'Security answer is incorrect' });
  }

  user.passwordHash = await bcrypt.hash(newPassword, 10);
  await user.save();

  return res.json({ success: true, message: 'Password reset successful' });
}

