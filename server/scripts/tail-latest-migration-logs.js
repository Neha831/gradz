import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';

dotenv.config();

const reportsDir = path.resolve(
  process.cwd(),
  process.env.MIGRATION_REPORTS_DIR || './migration-reports'
);
const tailLines = Number(process.env.MIGRATION_TAIL_LINES || 30);

function pickLatestRunDir(root) {
  if (!fs.existsSync(root)) return null;
  const dirs = fs
    .readdirSync(root, { withFileTypes: true })
    .filter((e) => e.isDirectory())
    .map((e) => e.name)
    .sort();
  if (!dirs.length) return null;
  return path.join(root, dirs[dirs.length - 1]);
}

function readLastLines(filePath, n) {
  if (!fs.existsSync(filePath)) return [`[tail] file not found: ${filePath}`];
  const content = fs.readFileSync(filePath, 'utf8');
  const lines = content.split(/\r?\n/);
  const start = Math.max(0, lines.length - Math.max(1, n));
  return lines.slice(start);
}

function printSection(title, filePath, n) {
  console.log('');
  console.log(`----- ${title} (${n} lines) -----`);
  const lines = readLastLines(filePath, n);
  for (const line of lines) console.log(line);
}

function run() {
  const latestDir = pickLatestRunDir(reportsDir);
  if (!latestDir) {
    console.log(`[tail] no migration reports found in ${reportsDir}`);
    process.exit(1);
  }

  const migrateLog = path.join(latestDir, 'migrate.log');
  const verifyLog = path.join(latestDir, 'verify.log');

  console.log('========== Latest Migration Logs ==========');
  console.log(`run dir: ${latestDir}`);
  printSection('migrate.log', migrateLog, tailLines);
  printSection('verify.log', verifyLog, tailLines);
  console.log('');
  console.log('===========================================');
}

run();

