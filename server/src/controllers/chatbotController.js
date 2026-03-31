import fs from 'fs';
import path from 'path';

export function getChatbotStorePath() {
  return path.resolve(process.cwd(), 'chatbot-responses.json');
}

function readResponsesArray() {
  const file = getChatbotStorePath();
  try {
    const raw = fs.existsSync(file) ? fs.readFileSync(file, 'utf8') : '[]';
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeResponsesArray(rows) {
  const file = getChatbotStorePath();
  fs.writeFileSync(file, JSON.stringify(rows, null, 2), 'utf8');
}

function appendChatbotEntry(payload) {
  const existing = readResponsesArray();
  existing.push({ at: new Date().toISOString(), payload });
  writeResponsesArray(existing);
  return existing.length;
}

export async function listChatbotResponses(_req, res) {
  try {
    const data = readResponsesArray();
    return res.json({ success: true, responses: data });
  } catch (e) {
    return res.status(500).json({ success: false, message: e?.message || 'Read failed' });
  }
}

export async function appendChatbotResponse(req, res) {
  const payload = req.body?.payload ?? req.body?.responses ?? req.body?.data ?? req.body;
  if (payload === undefined || payload === null || (typeof payload === 'object' && !Object.keys(payload).length)) {
    return res.status(400).json({ success: false, message: 'payload required (JSON body)' });
  }

  const total = appendChatbotEntry(payload);
  return res.json({ success: true, message: 'Saved', total });
}

export async function appendStudentChatMessage(req, res) {
  const text = String(req.body?.text ?? req.body?.message ?? '').trim();
  if (!text) {
    return res.status(400).json({ success: false, message: 'text required' });
  }

  const payload = {
    kind: 'student_message',
    email: req.user?.email || '',
    userId: req.user?.sub || null,
    text
  };
  const total = appendChatbotEntry(payload);
  return res.json({ success: true, message: 'Sent', total });
}
