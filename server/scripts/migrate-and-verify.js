import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { spawn } from 'child_process';

dotenv.config();

const statusFile = path.resolve(
  process.cwd(),
  process.env.MIGRATION_STATUS_FILE || './migration-status.json'
);
const reportsDir = path.resolve(
  process.cwd(),
  process.env.MIGRATION_REPORTS_DIR || './migration-reports'
);

function getRunId() {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}-${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}`;
}

function runCommand(command, args, logFilePath) {
  return new Promise((resolve) => {
    const child = spawn(command, args, {
      cwd: process.cwd(),
      stdio: ['inherit', 'pipe', 'pipe'],
      shell: true
    });

    let stdout = '';
    let stderr = '';
    child.stdout.on('data', (d) => {
      const s = d.toString();
      stdout += s;
      process.stdout.write(s);
      if (logFilePath) fs.appendFileSync(logFilePath, s, 'utf8');
    });
    child.stderr.on('data', (d) => {
      const s = d.toString();
      stderr += s;
      process.stderr.write(s);
      if (logFilePath) fs.appendFileSync(logFilePath, s, 'utf8');
    });

    child.on('close', (code) => {
      resolve({
        ok: code === 0,
        exitCode: Number(code || 0),
        stdout,
        stderr
      });
    });
  });
}

async function run() {
  fs.mkdirSync(reportsDir, { recursive: true });
  const runId = getRunId();
  const runDir = path.join(reportsDir, runId);
  fs.mkdirSync(runDir, { recursive: true });
  const migrateLogPath = path.join(runDir, 'migrate.log');
  const verifyLogPath = path.join(runDir, 'verify.log');
  const runSummaryPath = path.join(runDir, 'summary.json');

  const startedAt = new Date();
  console.log(`[pipeline] starting doctor + migrate + verify (run ${runId})...`);

  fs.writeFileSync(migrateLogPath, '', 'utf8');
  fs.writeFileSync(verifyLogPath, '', 'utf8');

  const doctor = await runCommand('npm', ['run', 'migrate:doctor'], migrateLogPath);
  const migrate = doctor.ok
    ? await runCommand('npm', ['run', 'migrate:mysql'], migrateLogPath)
    : { ok: false, exitCode: -1, stdout: '', stderr: 'migration skipped because doctor failed' };
  const verify = migrate.ok
    ? await runCommand('npm', ['run', 'verify:migration'], verifyLogPath)
    : { ok: false, exitCode: -1, stdout: '', stderr: 'verify skipped because migration failed' };

  if (!doctor.ok) {
    fs.appendFileSync(migrateLogPath, 'migration skipped because doctor failed\n', 'utf8');
    fs.appendFileSync(verifyLogPath, 'verify skipped because doctor failed\n', 'utf8');
  } else if (!migrate.ok) {
    fs.appendFileSync(verifyLogPath, 'verify skipped because migration failed\n', 'utf8');
  }

  const finishedAt = new Date();
  const payload = {
    success: migrate.ok && verify.ok,
    runId,
    reports: {
      directory: runDir,
      migrateLog: migrateLogPath,
      verifyLog: verifyLogPath,
      summaryFile: runSummaryPath
    },
    startedAt: startedAt.toISOString(),
    finishedAt: finishedAt.toISOString(),
    durationSeconds: Math.round((finishedAt.getTime() - startedAt.getTime()) / 1000),
    steps: {
      doctor: {
        ok: doctor.ok,
        exitCode: doctor.exitCode
      },
      migrate: {
        ok: migrate.ok,
        exitCode: migrate.exitCode
      },
      verify: {
        ok: verify.ok,
        exitCode: verify.exitCode
      }
    }
  };

  fs.writeFileSync(runSummaryPath, JSON.stringify(payload, null, 2), 'utf8');
  fs.mkdirSync(path.dirname(statusFile), { recursive: true });
  fs.writeFileSync(statusFile, JSON.stringify(payload, null, 2), 'utf8');

  console.log('');
  console.log(`[pipeline] status file: ${statusFile}`);
  console.log(`[pipeline] reports dir: ${runDir}`);
  console.log(`[pipeline] doctor step: ${payload.steps.doctor.ok ? 'YES' : 'NO'}`);
  console.log(`[pipeline] success: ${payload.success ? 'YES' : 'NO'}`);

  if (!payload.success) {
    process.exit(1);
  }
}

run().catch((err) => {
  fs.mkdirSync(reportsDir, { recursive: true });
  const failure = {
    success: false,
    error: err?.message || String(err),
    at: new Date().toISOString()
  };
  fs.mkdirSync(path.dirname(statusFile), { recursive: true });
  fs.writeFileSync(statusFile, JSON.stringify(failure, null, 2), 'utf8');
  console.error('[pipeline] failed:', err);
  process.exit(1);
});

