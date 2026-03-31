import { ProctorEvent } from '../models/ProctorEvent.js';
import { resolveCanonicalExamCode } from '../utils/examCodeResolve.js';

export async function logTabSwitch(req, res) {
  const email_id = String(req.user?.email || req.body?.email_id || '').trim().toLowerCase();
  const exam_code = await resolveCanonicalExamCode(String(req.body?.exam_code || '').trim());
  const event_type = String(req.body?.event_type || 'tab_switch').trim();
  const note = String(req.body?.note || '').trim();

  if (!email_id || !exam_code) {
    return res.status(400).json({ success: false, message: 'email_id and exam_code are required' });
  }

  await ProctorEvent.create({ email_id, exam_code, event_type, note });
  return res.json({ success: true, message: 'Proctor event logged' });
}

