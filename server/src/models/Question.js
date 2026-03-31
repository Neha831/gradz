import mongoose from 'mongoose';

const QuestionSchema = new mongoose.Schema(
  {
    exam_code: { type: String, required: true, index: true },
    exam_title: { type: String, required: true },
    exam_date: { type: Date, required: true, index: true },
    duration: { type: Number, required: true }, // minutes
    max_marks: { type: Number, default: null },

    // Allocation
    domain: { type: String, default: '' },

    question_text: { type: String, required: true },
    option_1: { type: String, required: true },
    option_2: { type: String, required: true },
    option_3: { type: String, required: true },
    option_4: { type: String, required: true },
    correct_answer: { type: Number, required: true, min: 1, max: 4 },
    marks: { type: Number, default: 0 }
  },
  { timestamps: true }
);

export const Question = mongoose.models.Question ?? mongoose.model('Question', QuestionSchema);

