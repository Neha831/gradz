import { User } from '../models/User.js';
import bcrypt from 'bcryptjs';
import xlsx from 'xlsx';

export async function listUsers(req, res) {
  const role = req.query.role || 'student';
  const users = await User.find({ role }).select('-passwordHash').lean();
  return res.json({ success: true, users });
}

// Admin-only: create student (equivalent of add_student.php)
export async function createStudent(req, res) {
  const {
    email_id,
    password,
    college_name = '',
    full_name = '',
    phone_number = '',
    course_branch = '',
    domain = '',
    security_question = '',
    security_answer = ''
  } = req.body || {};

  if (!email_id || !password) {
    return res.status(400).json({ success: false, message: 'email_id and password are required' });
  }
  if (String(password).length < 6) {
    return res.status(400).json({ success: false, message: 'Password must be at least 6 characters' });
  }

  const email = String(email_id).trim().toLowerCase();
  const exists = await User.findOne({ email_id: email });
  if (exists) return res.status(409).json({ success: false, message: 'Email already exists' });

  const passwordHash = await bcrypt.hash(String(password), 10);
  const secQ = String(security_question || '').trim();
  const secA = String(security_answer || '').trim();
  const security_answer_hash = secA ? await bcrypt.hash(secA, 10) : '';

  const user = await User.create({
    role: 'student',
    email_id: email,
    passwordHash,
    college_name: String(college_name || ''),
    full_name: String(full_name || ''),
    phone_number: String(phone_number || ''),
    course_branch: String(course_branch || ''),
    domain: String(domain || ''),
    security_question: secQ,
    security_answer: security_answer_hash
  });

  return res.json({
    success: true,
    message: 'Student added successfully',
    student: {
      id: user._id.toString(),
      email_id: user.email_id,
      full_name: user.full_name
    }
  });
}

// Admin-only: update student profile from management table
export async function updateStudent(req, res) {
  const id = String(req.params.id || '').trim();
  if (!id) return res.status(400).json({ success: false, message: 'Student id is required' });

  const allowed = [
    'full_name',
    'college_name',
    'phone_number',
    'course_branch',
    'domain',
    'alt_phone_number',
    'year_of_study',
    'roll_number',
    'security_question'
  ];
  const set = {};
  for (const key of allowed) {
    if (req.body?.[key] !== undefined) set[key] = String(req.body[key] ?? '');
  }

  if (req.body?.security_answer !== undefined && String(req.body.security_answer).trim() !== '') {
    set.security_answer = await bcrypt.hash(String(req.body.security_answer).trim(), 10);
  }

  const user = await User.findOneAndUpdate(
    { _id: id, role: 'student' },
    { $set: set },
    { new: true }
  )
    .select('-passwordHash')
    .lean();

  if (!user) return res.status(404).json({ success: false, message: 'Student not found' });
  return res.json({ success: true, message: 'Student updated', student: user });
}

// Admin-only: delete student
export async function deleteStudent(req, res) {
  const id = String(req.params.id || '').trim();
  if (!id) return res.status(400).json({ success: false, message: 'Student id is required' });

  const deleted = await User.findOneAndDelete({ _id: id, role: 'student' }).lean();
  if (!deleted) return res.status(404).json({ success: false, message: 'Student not found' });

  return res.json({ success: true, message: 'Student deleted successfully' });
}

// Admin-only: export students as CSV
export async function exportStudentsCsv(req, res) {
  const users = await User.find({ role: 'student' })
    .select('full_name email_id phone_number college_name course_branch domain')
    .sort({ createdAt: -1 })
    .lean();

  const headers = ['Full Name', 'Email', 'Phone Number', 'College Name', 'Course Branch', 'Domain'];
  const escapeCsv = (v) => {
    const s = String(v ?? '');
    if (s.includes(',') || s.includes('"') || s.includes('\n')) return `"${s.replaceAll('"', '""')}"`;
    return s;
  };

  const lines = [headers.join(',')];
  for (const u of users) {
    lines.push(
      [
        u.full_name || '',
        u.email_id || '',
        u.phone_number || '',
        u.college_name || '',
        u.course_branch || '',
        u.domain || ''
      ]
        .map(escapeCsv)
        .join(',')
    );
  }

  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', 'attachment; filename="students_export.csv"');
  return res.send(lines.join('\n'));
}

export async function exportStudentsXlsx(req, res) {
  const users = await User.find({ role: 'student' })
    .select('full_name email_id phone_number security_question security_answer college_name course_branch domain')
    .sort({ createdAt: -1 })
    .lean();

  const rows = users.map((u) => ({
    'Full Name': u.full_name || '',
    'Email ID': u.email_id || '',
    'Mobile Number': u.phone_number || '',
    'Security Question': u.security_question || '',
    'Security Answer (hash)': u.security_answer || '',
    'College Name': u.college_name || '',
    'Course Branch': u.course_branch || '',
    Domain: u.domain || ''
  }));

  const ws = xlsx.utils.json_to_sheet(rows.length ? rows : [{ 'Full Name': '' }]);
  const wb = xlsx.utils.book_new();
  xlsx.utils.book_append_sheet(wb, ws, 'Students');
  const buf = xlsx.write(wb, { type: 'buffer', bookType: 'xlsx' });

  res.setHeader(
    'Content-Type',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  );
  res.setHeader('Content-Disposition', 'attachment; filename="students_export.xlsx"');
  return res.send(Buffer.from(buf));
}

