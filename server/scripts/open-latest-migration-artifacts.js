import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';

dotenv.config();

const reportsDir = path.resolve(
  process.cwd(),
  process.env.MIGRATION_REPORTS_DIR || './migration-reports'
);
const statusFile = path.resolve(
  process.cwd(),
  process.env.MIGRATION_STATUS_FILE || './migration-status.json'
);

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
    console.log(
      JSON.stringify(
        {
          success: false,
          message: `No migration reports found in ${reportsDir}`
        },
        null,
        2
      )
    );
    process.exit(1);
  }

  const out = {
    success: true,
    reportsDir,
    latestRunDir: latestDir,
    files: {
      statusFile,
      summaryFile: path.join(latestDir, 'summary.json'),
      migrateLog: path.join(latestDir, 'migrate.log'),
      verifyLog: path.join(latestDir, 'verify.log')
    }
  };

  console.log(JSON.stringify(out, null, 2));
}

run();

