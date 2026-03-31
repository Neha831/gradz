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
const VERIFY_SAMPLE_SIZE = Number(process.env.VERIFY_SAMPLE_SIZE || 10);

function fmt(n) {
  return Number(n || 0).toLocaleString('en-IN');
}

async function run() {
  console.log('[verify] connecting mongodb...');
  await mongoose.connect(MONGO_URI);
  console.log('[verify] mongodb connected');

  console.log('[verify] connecting mysql...');
  const conn = await mysql.createConnection({
    host: MYSQL_HOST,
    user: MYSQL_USER,
    password: MYSQL_PASSWORD,
    database: MYSQL_DB
  });
  console.log('[verify] mysql connected');

  // High-level counts
  const [[regCountRow]] = await conn.query('SELECT COUNT(*) AS c FROM registrations');
  const [[qCountRow]] = await conn.query('SELECT COUNT(*) AS c FROM omr_questions');
  const [[ansCountRow]] = await conn.query('SELECT COUNT(*) AS c FROM omr_answers');
  const [[evalCountRow]] = await conn.query('SELECT COUNT(*) AS c FROM evaluate');

  const [mongoUsers, mongoQuestions, mongoSubmissions, mongoFallbackRows] = await Promise.all([
    User.countDocuments({ role: 'student' }),
    Question.countDocuments({}),
    Submission.countDocuments({}),
    Submission.countDocuments({ question_text: '__TOTAL_FROM_EVALUATE__' })
  ]);

  // Sample reconciliation: compare per (exam_code, email_id) obtained marks from omr_answers vs submissions
  const [sampleRows] = await conn.query(
    `SELECT 
      oa.exam_code,
      LOWER(TRIM(oa.email_id)) AS email_id,
      SUM(CASE WHEN oa.is_correct = 1 THEN COALESCE(oq.marks, 0) ELSE 0 END) AS mysql_obtained
     FROM omr_answers oa
     LEFT JOIN omr_questions oq
       ON oq.exam_code = oa.exam_code
      AND oq.question_text = oa.question
     GROUP BY oa.exam_code, LOWER(TRIM(oa.email_id))
     ORDER BY RAND()
     LIMIT ?`,
    [Math.max(1, VERIFY_SAMPLE_SIZE)]
  );

  let matched = 0;
  let mismatched = 0;
  const mismatchDetails = [];

  for (const s of sampleRows) {
    const examCode = String(s.exam_code || '').trim();
    const email = String(s.email_id || '').trim().toLowerCase();
    if (!examCode || !email) continue;

    const mongoAgg = await Submission.aggregate([
      { $match: { exam_code: examCode, email_id: email } },
      { $group: { _id: null, obtained: { $sum: '$marks_awarded' } } }
    ]);

    const mysqlObtained = Number(s.mysql_obtained || 0);
    const mongoObtained = Number(mongoAgg?.[0]?.obtained || 0);
    if (mysqlObtained === mongoObtained) {
      matched += 1;
    } else {
      mismatched += 1;
      mismatchDetails.push({
        exam_code: examCode,
        email_id: email,
        mysql_obtained: mysqlObtained,
        mongo_obtained: mongoObtained
      });
    }
  }

  await conn.end();
  await mongoose.disconnect();

  console.log('');
  console.log('========== Migration Verify Report ==========');
  console.log(`[counts] registrations(mysql)=${fmt(regCountRow.c)} | users(student,mongo)=${fmt(mongoUsers)}`);
  console.log(`[counts] omr_questions(mysql)=${fmt(qCountRow.c)} | questions(mongo)=${fmt(mongoQuestions)}`);
  console.log(`[counts] omr_answers(mysql)=${fmt(ansCountRow.c)} | submissions(mongo)=${fmt(mongoSubmissions)}`);
  console.log(`[counts] evaluate(mysql)=${fmt(evalCountRow.c)} | evaluate_fallback_rows(mongo)=${fmt(mongoFallbackRows)}`);
  console.log(`[sample] checked=${fmt(sampleRows.length)} | matched=${fmt(matched)} | mismatched=${fmt(mismatched)}`);

  if (mismatchDetails.length) {
    console.log('[sample] mismatches (first 10):');
    mismatchDetails.slice(0, 10).forEach((m, idx) => {
      console.log(
        `  ${idx + 1}. exam=${m.exam_code}, email=${m.email_id}, mysql=${m.mysql_obtained}, mongo=${m.mongo_obtained}`
      );
    });
  }
  console.log('=============================================');
  console.log('[verify] done');
}

run().catch((err) => {
  console.error('[verify] failed:', err);
  process.exit(1);
});

