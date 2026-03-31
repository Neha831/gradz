import fs from 'fs';
import path from 'path';

const rootSnapshotsDir = path.resolve(process.cwd(), '..', 'snapshots');

function sanitizeSegment(str) {
  return String(str || '')
    .trim()
    .replace(/[^a-zA-Z0-9._-]/g, '_')
    .slice(0, 120);
}

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

function listDirs(targetPath) {
  if (!fs.existsSync(targetPath)) return [];
  return fs
    .readdirSync(targetPath, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => d.name)
    .sort((a, b) => a.localeCompare(b));
}

function listImages(targetPath) {
  if (!fs.existsSync(targetPath)) return [];
  return fs
    .readdirSync(targetPath, { withFileTypes: true })
    .filter((d) => d.isFile() && /\.(jpg|jpeg|png|gif|webp)$/i.test(d.name))
    .map((d) => d.name)
    .sort((a, b) => b.localeCompare(a));
}

/** Match directory name under parent (case-insensitive compare of sanitized segments). */
function resolveExamDirName(parentDir, examSegment) {
  const want = sanitizeSegment(examSegment);
  if (!want) return '';
  const wantLower = want.toLowerCase();
  if (!fs.existsSync(parentDir)) return '';
  const dirs = fs
    .readdirSync(parentDir, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => d.name);
  for (const d of dirs) {
    if (d.toLowerCase() === wantLower) return d;
  }
  return want;
}

export function getSnapshotRootDir() {
  ensureDir(rootSnapshotsDir);
  return rootSnapshotsDir;
}

export async function listSnapshotStudents(_req, res) {
  const students = listDirs(getSnapshotRootDir());
  return res.json({ success: true, students });
}

export async function listSnapshotExamCodes(req, res) {
  const student = sanitizeSegment(req.params.student);
  const studentDir = path.join(getSnapshotRootDir(), student);
  const exam_codes = listDirs(studentDir);
  return res.json({ success: true, student, exam_codes });
}

export async function listSnapshotImages(req, res) {
  const student = sanitizeSegment(req.params.student);
  const studentDir = path.join(getSnapshotRootDir(), student);
  const exam_code = resolveExamDirName(studentDir, req.params.examCode);
  const snapDir = path.join(studentDir, exam_code);
  const files = listImages(snapDir);

  const images = files.map((file) => ({
    filename: file,
    url: `/snapshot-files/${encodeURIComponent(student)}/${encodeURIComponent(exam_code)}/${encodeURIComponent(file)}`
  }));

  return res.json({ success: true, student, exam_code, images });
}

/** All snapshot images under every student folder for this exam code (sanitized path segment). */
export async function listSnapshotImagesByExam(req, res) {
  const examParam = sanitizeSegment(req.params.examCode);
  if (!examParam) {
    return res.status(400).json({ success: false, message: 'exam_code is required' });
  }
  const root = getSnapshotRootDir();
  const students = listDirs(root);
  const images = [];
  for (const student of students) {
    const exam_code = resolveExamDirName(path.join(root, student), examParam);
    const snapDir = path.join(root, student, exam_code);
    const files = listImages(snapDir);
    for (const file of files) {
      images.push({
        student,
        filename: file,
        url: `/snapshot-files/${encodeURIComponent(student)}/${encodeURIComponent(exam_code)}/${encodeURIComponent(file)}`
      });
    }
  }
  return res.json({ success: true, exam_code: examParam, images });
}

export async function deleteSnapshotsByExam(req, res) {
  const exam_code = sanitizeSegment(req.body?.exam_code || '');
  if (!exam_code) {
    return res.status(400).json({ success: false, message: 'exam_code is required' });
  }
  const examLower = exam_code.toLowerCase();
  const root = getSnapshotRootDir();
  const students = listDirs(root);
  let removed = 0;
  for (const student of students) {
    const studentDir = path.join(root, student);
    const dirs = listDirs(studentDir);
    for (const d of dirs) {
      if (d.toLowerCase() !== examLower) continue;
      const snapDir = path.join(studentDir, d);
      if (fs.existsSync(snapDir)) {
        fs.rmSync(snapDir, { recursive: true, force: true });
        removed += 1;
      }
    }
  }
  return res.json({
    success: true,
    message: `Removed snapshot folders for exam code under ${removed} student director(ies).`
  });
}

