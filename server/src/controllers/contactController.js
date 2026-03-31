import { ContactMessage } from '../models/ContactMessage.js';

export async function submitContact(req, res) {
  const { name, email, contact_number, subject, message } = req.body || {};
  if (!name || !email || !message) {
    return res.status(400).json({ success: false, message: 'name, email, message are required' });
  }

  await ContactMessage.create({
    name: String(name),
    email: String(email),
    contact_number: contact_number ? String(contact_number) : '',
    subject: subject ? String(subject) : '',
    message: String(message)
  });

  return res.json({ success: true, message: 'Message sent successfully!' });
}

