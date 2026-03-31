import dotenv from 'dotenv';
import mongoose from 'mongoose';
import mysql from 'mysql2/promise';

dotenv.config();

const MONGO_URI = process.env.MONGO_URI || '';
const MYSQL_HOST = process.env.MYSQL_HOST || '';
const MYSQL_USER = process.env.MYSQL_USER || '';
const MYSQL_PASSWORD = process.env.MYSQL_PASSWORD || '';
const MYSQL_DB = process.env.MYSQL_DB || '';
const DOCTOR_TIMEOUT_MS = Number(process.env.MIGRATION_DOCTOR_TIMEOUT_MS || 8000);

function printCheck(name, ok, detail = '') {
  console.log(`[${ok ? 'OK' : 'FAIL'}] ${name}${detail ? ` - ${detail}` : ''}`);
}

async function checkMongo() {
  if (!MONGO_URI) {
    return { ok: false, detail: 'MONGO_URI missing' };
  }
  try {
    await mongoose.connect(MONGO_URI, { serverSelectionTimeoutMS: DOCTOR_TIMEOUT_MS });
    await mongoose.connection.db.admin().command({ ping: 1 });
    return { ok: true, detail: 'Mongo ping successful' };
  } catch (err) {
    return { ok: false, detail: err?.message || 'Mongo connection failed' };
  } finally {
    if (mongoose.connection.readyState !== 0) {
      await mongoose.disconnect();
    }
  }
}

async function checkMySql() {
  const missing = [];
  if (!MYSQL_HOST) missing.push('MYSQL_HOST');
  if (!MYSQL_USER) missing.push('MYSQL_USER');
  if (!MYSQL_DB) missing.push('MYSQL_DB');
  if (missing.length) {
    return { ok: false, detail: `Missing env: ${missing.join(', ')}` };
  }

  let conn;
  try {
    conn = await mysql.createConnection({
      host: MYSQL_HOST,
      user: MYSQL_USER,
      password: MYSQL_PASSWORD,
      database: MYSQL_DB,
      connectTimeout: DOCTOR_TIMEOUT_MS
    });
    await conn.query('SELECT 1');
    return { ok: true, detail: 'MySQL query successful' };
  } catch (err) {
    return { ok: false, detail: err?.message || 'MySQL connection failed' };
  } finally {
    if (conn) {
      await conn.end();
    }
  }
}

async function checkLegacyTables() {
  let conn;
  try {
    conn = await mysql.createConnection({
      host: MYSQL_HOST,
      user: MYSQL_USER,
      password: MYSQL_PASSWORD,
      database: MYSQL_DB,
      connectTimeout: DOCTOR_TIMEOUT_MS
    });
    const [rows] = await conn.query(
      `SELECT table_name
       FROM information_schema.tables
       WHERE table_schema = ?
         AND table_name IN ('registrations', 'omr_questions', 'omr_answers', 'evaluate')`,
      [MYSQL_DB]
    );
    const found = new Set(rows.map((r) => String(r.table_name)));
    const required = ['registrations', 'omr_questions', 'omr_answers', 'evaluate'];
    const missing = required.filter((t) => !found.has(t));
    if (missing.length) {
      return { ok: false, detail: `Missing tables: ${missing.join(', ')}` };
    }
    return { ok: true, detail: 'All required legacy tables found' };
  } catch (err) {
    return { ok: false, detail: err?.message || 'Table check failed' };
  } finally {
    if (conn) await conn.end();
  }
}

async function run() {
  console.log('========== Migration Doctor ==========');
  printCheck('Environment', true, '.env loaded');

  const mongo = await checkMongo();
  printCheck('MongoDB connectivity', mongo.ok, mongo.detail);

  const mysqlConn = await checkMySql();
  printCheck('MySQL connectivity', mysqlConn.ok, mysqlConn.detail);

  const mysqlTables = mysqlConn.ok ? await checkLegacyTables() : { ok: false, detail: 'Skipped (MySQL not connected)' };
  printCheck('Legacy table presence', mysqlTables.ok, mysqlTables.detail);

  console.log('======================================');

  const allOk = mongo.ok && mysqlConn.ok && mysqlTables.ok;
  if (!allOk) {
    process.exit(1);
  }
}

run().catch((err) => {
  console.error('[doctor] failed:', err);
  process.exit(1);
});

