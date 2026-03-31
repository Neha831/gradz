import mongoose from 'mongoose';

const SubmissionSchema = new mongoose.Schema(
  {
    exam_code: { type: String, required: true, index: true },
    exam_title: { type: String, default: '' },
    email_id: { type: String, required: true, index: true },
    student_name: { type: String, default: '' },
    is_guest_exam: { type: Boolean, default: false },

    time_taken_seconds: { type: Number, default: 0 },

    // Store one row per question (legacy `omr_answers` style)
    question_text: { type: String, required: true },
    answer_selected: { type: Number, required: true, default: 0 },
    correct_answer: { type: Number, required: true, default: 0 },
    is_correct: { type: Boolean, default: false },
    question_marks: { type: Number, required: true, default: 0 }, // the question's total marks (max)
    marks_awarded: { type: Number, default: 0 } // equals question_marks when correct, else 0
  },
  { timestamps: { createdAt: 'submitted_at', updatedAt: false } }
);

SubmissionSchema.index({ exam_code: 1, email_id: 1, question_text: 1 }, { unique: true });

export const Submission =
  mongoose.models.Submission ?? mongoose.model('Submission', SubmissionSchema);

