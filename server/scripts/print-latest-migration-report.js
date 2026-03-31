import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';

dotenv.config();

const reportsDir = path.resolve(
  process.cwd(),
  process.env.MIGRATION_REPORTS_DIR || './migration-reports'
);

function safeReadJson(filePath) {
  try {
    if (!fs.existsSync(filePath)) return null;
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch {
    return null;
  }
}

function fmtBool(v) {
  return v ? 'YES' : 'NO';
}

function pickLatestRunDir(root) {
  if (!fs.existsSync(root)) return null;
  const entries = fs
    .readdirSync(root, { withFileTypes: true })
    .filter((e) => e.isDirectory())
    .map((e) => e.name)
    .sort();
  if (!entries.length) return null;
  return path.join(root, entries[entries.length - 1]);
}

function run() {
  const latestDir = pickLatestRunDir(reportsDir);
  if (!latestDir) {
    console.log(`[latest-report] no migration reports found in ${reportsDir}`);
    process.exit(1);
  }

  const summaryPath = path.join(latestDir, 'summary.json');
  const summary = safeReadJson(summaryPath);
  if (!summary) {
    console.log(`[latest-report] summary not found or invalid: ${summaryPath}`);
    process.exit(1);
  }

  console.log('========== Latest Migration Report ==========');
  console.log(`run id: ${summary.runId || path.basename(latestDir)}`);
  console.log(`success: ${fmtBool(summary.success)}`);
  console.log(`started: ${summary.startedAt || 'N/A'}`);
  console.log(`finished: ${summary.finishedAt || 'N/A'}`);
  console.log(`duration_sec: ${summary.durationSeconds ?? 'N/A'}`);
  if (summary?.steps?.doctor) {
    console.log(`doctor step: ${fmtBool(summary?.steps?.doctor?.ok)} (exit=${summary?.steps?.doctor?.exitCode ?? 'N/A'})`);
  }
  console.log(`migrate step: ${fmtBool(summary?.steps?.migrate?.ok)} (exit=${summary?.steps?.migrate?.exitCode ?? 'N/A'})`);
  console.log(`verify step: ${fmtBool(summary?.steps?.verify?.ok)} (exit=${summary?.steps?.verify?.exitCode ?? 'N/A'})`);
  console.log(`report dir: ${latestDir}`);
  console.log(`summary: ${summaryPath}`);
  console.log(`migrate log: ${path.join(latestDir, 'migrate.log')}`);
  console.log(`verify log: ${path.join(latestDir, 'verify.log')}`);
  console.log('=============================================');
}

run();

