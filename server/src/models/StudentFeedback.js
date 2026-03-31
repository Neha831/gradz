import mongoose from 'mongoose';

const StudentFeedbackSchema = new mongoose.Schema(
  {
    student_name: { type: String, required: true },
    email_id: { type: String, required: true, index: true },
    exam_code: { type: String, required: true, index: true },

    q1_experience: { type: String, required: true },
    q2_ui: { type: String, required: true },
    q3_technical: { type: String, required: true },
    q4_proctoring: { type: String, required: true },

    is_guest_exam: { type: Boolean, default: false }
  },
  { timestamps: { createdAt: 'submitted_at', updatedAt: false } }
);

export const StudentFeedback =
  mongoose.models.StudentFeedback ??
  mongoose.model('StudentFeedback', StudentFeedbackSchema);

