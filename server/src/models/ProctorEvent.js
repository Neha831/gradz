import mongoose from 'mongoose';

const ProctorEventSchema = new mongoose.Schema(
  {
    email_id: { type: String, required: true, index: true },
    exam_code: { type: String, required: true, index: true },
    event_type: { type: String, required: true, default: 'tab_switch' },
    note: { type: String, default: '' }
  },
  { timestamps: { createdAt: 'created_at', updatedAt: false } }
);

export const ProctorEvent =
  mongoose.models.ProctorEvent ?? mongoose.model('ProctorEvent', ProctorEventSchema);

