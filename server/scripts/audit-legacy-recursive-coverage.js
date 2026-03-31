import fs from 'fs';
import path from 'path';

function readText(p) {
  return fs.existsSync(p) ? fs.readFileSync(p, 'utf8') : '';
}

function extractLegacyPaths(text) {
  const matches = text.match(/\/[A-Za-z0-9._/-]+\.(html|php)\b/g) || [];
  return new Set(matches.map((m) => m.toLowerCase()));
}

function shouldSkip(relPath) {
  const p = relPath.replaceAll('\\', '/').toLowerCase();
  const skipPrefixes = [
    '.git/',
    'node_modules/',
    'client/',
    'server/',
    'mern/',
    'mern-full/',
    'phpmailer/'
  ];
  return skipPrefixes.some((x) => p.startsWith(x));
}

function walkLegacyFiles(rootDir, relDir = '') {
  const abs = path.join(rootDir, relDir);
  const out = [];
  for (const d of fs.readdirSync(abs, { withFileTypes: true })) {
    const nextRel = path.join(relDir, d.name);
    if (shouldSkip(nextRel)) continue;
    if (d.isDirectory()) {
      out.push(...walkLegacyFiles(rootDir, nextRel));
      continue;
    }
    const lower = d.name.toLowerCase();
    if (lower.endsWith('.html') || lower.endsWith('.php')) {
      out.push(nextRel.replaceAll('\\', '/').toLowerCase());
    }
  }
  return out.sort();
}

function main() {
  const serverDir = process.cwd();
  const rootDir = path.resolve(serverDir, '..');
  const clientSrc = path.join(rootDir, 'client', 'src');

  const appFile = path.join(clientSrc, 'App.jsx');
  const redirectsFile = path.join(clientSrc, 'data', 'legacyHtmlRedirects.js');
  const legacyRoutesFile = path.join(serverDir, 'src', 'routes', 'legacyRoutes.js');

  const referenced = new Set([
    ...extractLegacyPaths(readText(appFile)),
    ...extractLegacyPaths(readText(redirectsFile)),
    ...extractLegacyPaths(readText(legacyRoutesFile))
  ]);

  const recursiveLegacyFiles = walkLegacyFiles(rootDir);
  const missing = recursiveLegacyFiles
    .filter((f) => !referenced.has(`/${f}`))
    .sort();

  const report = {
    generated_at: new Date().toISOString(),
    root_dir: rootDir,
    scanned_count: recursiveLegacyFiles.length,
    referenced_paths: referenced.size,
    missing_count: missing.length,
    missing_files: missing
  };

  const outPath = path.join(serverDir, 'legacy-recursive-coverage-report.json');
  fs.writeFileSync(outPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');

  // eslint-disable-next-line no-console
  console.log(`Legacy recursive coverage report: ${outPath}`);
  // eslint-disable-next-line no-console
  console.log(`Missing recursive legacy files: ${missing.length}`);
  if (missing.length) process.exitCode = 1;
}

main();
