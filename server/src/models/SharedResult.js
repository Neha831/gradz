import mongoose from 'mongoose';

const SharedResultSchema = new mongoose.Schema(
  {
    exam_code: { type: String, required: true, index: true },
    email_id: { type: String, required: true, index: true },
    shared: { type: Boolean, default: false }
  },
  { timestamps: true }
);

SharedResultSchema.index({ exam_code: 1, email_id: 1 }, { unique: true });

export const SharedResult =
  mongoose.models.SharedResult ?? mongoose.model('SharedResult', SharedResultSchema);

