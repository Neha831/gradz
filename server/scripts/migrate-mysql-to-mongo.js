import dotenv from 'dotenv';
import mysql from 'mysql2/promise';
import mongoose from 'mongoose';

import { User } from '../src/models/User.js';
import { Question } from '../src/models/Question.js';
import { Submission } from '../src/models/Submission.js';

dotenv.config();

const MYSQL_HOST = process.env.MYSQL_HOST || 'localhost';
const MYSQL_USER = process.env.MYSQL_USER || 'root';
const MYSQL_PASSWORD = process.env.MYSQL_PASSWORD || '';
const MYSQL_DB = process.env.MYSQL_DB || 'u245386400_fourise_exam';
const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/gradezy';
const BATCH_SIZE = Number(process.env.MIGRATE_BATCH_SIZE || 1000);

function chunkArray(arr, size) {
  if (!Array.isArray(arr) || !arr.length) return [];
  const out = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

async function run() {
  const summary = {
    users: { sourceRows: 0, preparedOps: 0, written: 0, skipped: 0, error: '' },
    questions: { sourceRows: 0, preparedOps: 0, written: 0, skipped: 0, error: '' },
    answers: { sourceRows: 0, preparedOps: 0, written: 0, skipped: 0, error: '' },
    evaluateFallback: { sourceRows: 0, inserted: 0, skippedExisting: 0, skippedInvalid: 0, error: '' }
  };

  console.log('[migrate] connecting mongodb...');
  await mongoose.connect(MONGO_URI);
  console.log('[migrate] mongodb connected');

  console.log('[migrate] connecting mysql...');
  const conn = await mysql.createConnection({
    host: MYSQL_HOST,
    user: MYSQL_USER,
    password: MYSQL_PASSWORD,
    database: MYSQL_DB
  });
  console.log('[migrate] mysql connected');

  // 1) migrate registrations -> users(student)
  try {
    const [rows] = await conn.query(
      `SELECT 
        full_name, email_id, password, college_name, phone_number, course_branch, domain,
        security_question, security_answer,
        alt_phone_number, dob, gender,
        current_address_house, current_address_street, current_address_city, current_address_state, current_address_pincode,
        permanent_address_house, permanent_address_street, permanent_address_city, permanent_address_state, permanent_address_pincode,
        college_address, year_of_study, roll_number, university_reg_no,
        internship_selected, internship_mode, internship_start_date, internship_duration_months, internship_end_date
      FROM registrations`
    );

    summary.users.sourceRows = rows.length;
    const filtered = rows.filter((r) => r.email_id && r.password);
    summary.users.skipped = rows.length - filtered.length;
    const ops = filtered
      .map((r) => ({
        updateOne: {
          filter: { email_id: String(r.email_id).trim().toLowerCase() },
          update: {
            $set: {
              role: 'student',
              email_id: String(r.email_id).trim().toLowerCase(),
              // Legacy DB often used PHP md5() (32 hex) or bcrypt; MERN login accepts both and upgrades MD5 on first login.
              passwordHash: r.password,
              full_name: r.full_name || '',
              college_name: r.college_name || '',
              phone_number: r.phone_number || '',
              course_branch: r.course_branch || '',
              domain: r.domain || '',
              security_question: r.security_question || '',
              security_answer: r.security_answer || '',
              alt_phone_number: r.alt_phone_number || '',
              dob: r.dob || '',
              gender: r.gender || '',
              current_address_house: r.current_address_house || '',
              current_address_street: r.current_address_street || '',
              current_address_city: r.current_address_city || '',
              current_address_state: r.current_address_state || '',
              current_address_pincode: r.current_address_pincode || '',
              permanent_address_house: r.permanent_address_house || '',
              permanent_address_street: r.permanent_address_street || '',
              permanent_address_city: r.permanent_address_city || '',
              permanent_address_state: r.permanent_address_state || '',
              permanent_address_pincode: r.permanent_address_pincode || '',
              college_address: r.college_address || '',
              year_of_study: r.year_of_study || '',
              roll_number: r.roll_number || '',
              university_reg_no: r.university_reg_no || '',
              internship_selected: r.internship_selected || '',
              internship_mode: r.internship_mode || '',
              internship_start_date: r.internship_start_date || '',
              internship_duration_months: r.internship_duration_months || '',
              internship_end_date: r.internship_end_date || ''
            }
          },
          upsert: true
        }
      }));

    summary.users.preparedOps = ops.length;
    if (ops.length) {
      let written = 0;
      for (const batch of chunkArray(ops, BATCH_SIZE)) {
        const result = await User.bulkWrite(batch);
        written += (result.upsertedCount || 0) + (result.modifiedCount || 0);
      }
      summary.users.written = written;
      console.log('[migrate] users migrated:', written);
    } else {
      console.log('[migrate] no user rows found');
    }
  } catch (e) {
    summary.users.error = e.message;
    console.warn('[migrate] registrations migration skipped:', e.message);
  }

  // 2) migrate omr_questions -> questions
  try {
    const [rows] = await conn.query(
      `SELECT exam_code, exam_title, exam_date, duration, max_marks, domain,
              question_text, option_1, option_2, option_3, option_4, correct_answer, marks
       FROM omr_questions`
    );

    summary.questions.sourceRows = rows.length;
    const filtered = rows.filter((r) => r.exam_code && r.question_text);
    summary.questions.skipped = rows.length - filtered.length;
    const ops = filtered
      .map((r) => ({
        updateOne: {
          filter: {
            exam_code: String(r.exam_code).trim(),
            question_text: String(r.question_text).trim()
          },
          update: {
            $set: {
              exam_code: String(r.exam_code).trim(),
              exam_title: r.exam_title || r.exam_code,
              exam_date: r.exam_date ? new Date(r.exam_date) : new Date(),
              duration: Number(r.duration || 20),
              max_marks: r.max_marks ?? null,
              domain: r.domain || '',
              question_text: r.question_text,
              option_1: r.option_1 || '',
              option_2: r.option_2 || '',
              option_3: r.option_3 || '',
              option_4: r.option_4 || '',
              correct_answer: Number(r.correct_answer || 1),
              marks: Number(r.marks || 0)
            }
          },
          upsert: true
        }
      }));

    summary.questions.preparedOps = ops.length;
    if (ops.length) {
      let written = 0;
      for (const batch of chunkArray(ops, BATCH_SIZE)) {
        const result = await Question.bulkWrite(batch);
        written += (result.upsertedCount || 0) + (result.modifiedCount || 0);
      }
      summary.questions.written = written;
      console.log('[migrate] questions migrated:', written);
    } else {
      console.log('[migrate] no questions found');
    }
  } catch (e) {
    summary.questions.error = e.message;
    console.warn('[migrate] questions migration skipped:', e.message);
  }

  // 3) migrate omr_answers -> submissions
  try {
    const [rows] = await conn.query(
      `SELECT 
        oa.exam_code,
        oa.exam_title,
        oa.email_id,
        oa.student_name,
        oa.question AS question_text,
        oa.answer_selected,
        oa.correct_answer,
        oa.is_correct,
        oa.submitted_at,
        oq.marks AS question_marks
      FROM omr_answers oa
      LEFT JOIN omr_questions oq
        ON oq.exam_code = oa.exam_code
       AND oq.question_text = oa.question`
    );

    summary.answers.sourceRows = rows.length;
    const filtered = rows.filter((r) => r.exam_code && r.email_id && r.question_text);
    summary.answers.skipped = rows.length - filtered.length;
    const ops = filtered
      .map((r) => {
        const email = String(r.email_id).trim().toLowerCase();
        const questionMarks = Number(r.question_marks || 0);
        const correct =
          r.is_correct === 1 ||
          r.is_correct === true ||
          String(r.is_correct || '').toLowerCase() === '1' ||
          String(r.is_correct || '').toLowerCase() === 'yes';
        const submittedAt = r.submitted_at ? new Date(r.submitted_at) : new Date();
        return {
          updateOne: {
            filter: {
              exam_code: String(r.exam_code).trim(),
              email_id: email,
              question_text: String(r.question_text).trim()
            },
            update: {
              $set: {
                exam_code: String(r.exam_code).trim(),
                exam_title: r.exam_title || r.exam_code,
                email_id: email,
                student_name: r.student_name || '',
                question_text: String(r.question_text).trim(),
                answer_selected: Number(r.answer_selected || 0),
                correct_answer: Number(r.correct_answer || 0),
                is_correct: correct,
                question_marks: questionMarks,
                marks_awarded: correct ? questionMarks : 0
              },
              $setOnInsert: { submitted_at: submittedAt }
            },
            upsert: true
          }
        };
      });

    summary.answers.preparedOps = ops.length;
    if (ops.length) {
      let written = 0;
      for (const batch of chunkArray(ops, BATCH_SIZE)) {
        const result = await Submission.bulkWrite(batch);
        written += (result.upsertedCount || 0) + (result.modifiedCount || 0);
      }
      summary.answers.written = written;
      console.log('[migrate] submissions (omr_answers) migrated:', written);
    } else {
      console.log('[migrate] no omr_answers rows found');
    }
  } catch (e) {
    summary.answers.error = e.message;
    console.warn('[migrate] omr_answers migration skipped:', e.message);
  }

  // 4) migrate evaluate totals as fallback when detailed answer rows are missing
  try {
    const [rows] = await conn.query(
      `SELECT exam_code, email_id, student_name, max_marks, obtained_marks FROM evaluate`
    );

    summary.evaluateFallback.sourceRows = rows.length;
    let insertedFallbackRows = 0;
    for (const r of rows) {
      const examCode = String(r.exam_code || '').trim();
      const email = String(r.email_id || '').trim().toLowerCase();
      if (!examCode || !email) {
        summary.evaluateFallback.skippedInvalid += 1;
        continue;
      }

      const existing = await Submission.countDocuments({ exam_code: examCode, email_id: email });
      if (existing > 0) {
        summary.evaluateFallback.skippedExisting += 1;
        continue;
      }

      const maxMarks = Number(r.max_marks || 0);
      const obtained = Number(r.obtained_marks || 0);

      await Submission.updateOne(
        {
          exam_code: examCode,
          email_id: email,
          question_text: '__TOTAL_FROM_EVALUATE__'
        },
        {
          $set: {
            exam_code: examCode,
            exam_title: examCode,
            email_id: email,
            student_name: r.student_name || '',
            question_text: '__TOTAL_FROM_EVALUATE__',
            answer_selected: 0,
            correct_answer: 0,
            is_correct: obtained >= maxMarks && maxMarks > 0,
            question_marks: maxMarks,
            marks_awarded: obtained
          }
        },
        { upsert: true }
      );
      insertedFallbackRows += 1;
    }

    summary.evaluateFallback.inserted = insertedFallbackRows;
    console.log('[migrate] evaluate fallback rows inserted:', insertedFallbackRows);
  } catch (e) {
    summary.evaluateFallback.error = e.message;
    console.warn('[migrate] evaluate migration skipped:', e.message);
  }

  await conn.end();
  await mongoose.disconnect();
  console.log('');
  console.log('========== Migration Summary ==========');
  console.log(`[users] source=${summary.users.sourceRows}, prepared=${summary.users.preparedOps}, written=${summary.users.written}, skipped=${summary.users.skipped}${summary.users.error ? `, error="${summary.users.error}"` : ''}`);
  console.log(`[questions] source=${summary.questions.sourceRows}, prepared=${summary.questions.preparedOps}, written=${summary.questions.written}, skipped=${summary.questions.skipped}${summary.questions.error ? `, error="${summary.questions.error}"` : ''}`);
  console.log(`[omr_answers] source=${summary.answers.sourceRows}, prepared=${summary.answers.preparedOps}, written=${summary.answers.written}, skipped=${summary.answers.skipped}${summary.answers.error ? `, error="${summary.answers.error}"` : ''}`);
  console.log(`[evaluate_fallback] source=${summary.evaluateFallback.sourceRows}, inserted=${summary.evaluateFallback.inserted}, skipped_existing=${summary.evaluateFallback.skippedExisting}, skipped_invalid=${summary.evaluateFallback.skippedInvalid}${summary.evaluateFallback.error ? `, error="${summary.evaluateFallback.error}"` : ''}`);
  console.log('=======================================');
  console.log('');
  console.log('[migrate] done');
}

run().catch((err) => {
  console.error('[migrate] failed:', err);
  process.exit(1);
});

