import mongoose from 'mongoose';

const ContactMessageSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    email: { type: String, required: true, index: true },
    contact_number: { type: String, default: '' },
    subject: { type: String, default: '' },
    message: { type: String, required: true },
  },
  { timestamps: true }
);

export const ContactMessage =
  mongoose.models.ContactMessage ??
  mongoose.model('ContactMessage', ContactMessageSchema);

