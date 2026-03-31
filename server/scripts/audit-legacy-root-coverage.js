import fs from 'fs';
import path from 'path';

function readText(p) {
  return fs.existsSync(p) ? fs.readFileSync(p, 'utf8') : '';
}

function extractLegacyPaths(text) {
  const matches = text.match(/\/[A-Za-z0-9._/-]+\.(html|php)\b/g) || [];
  return new Set(matches.map((m) => m.toLowerCase()));
}

function listRootFilesByExt(rootDir, ext) {
  return fs
    .readdirSync(rootDir, { withFileTypes: true })
    .filter((d) => d.isFile() && d.name.toLowerCase().endsWith(ext))
    .map((d) => d.name.toLowerCase())
    .sort();
}

function main() {
  const serverDir = process.cwd();
  const rootDir = path.resolve(serverDir, '..');
  const clientDir = path.join(rootDir, 'client', 'src');

  const appFile = path.join(clientDir, 'App.jsx');
  const redirectFile = path.join(clientDir, 'data', 'legacyHtmlRedirects.js');
  const legacyRoutesFile = path.join(serverDir, 'src', 'routes', 'legacyRoutes.js');

  const referenced = new Set([
    ...extractLegacyPaths(readText(appFile)),
    ...extractLegacyPaths(readText(redirectFile)),
    ...extractLegacyPaths(readText(legacyRoutesFile))
  ]);

  const rootHtml = listRootFilesByExt(rootDir, '.html');
  const rootPhp = listRootFilesByExt(rootDir, '.php');

  const missingHtml = rootHtml.filter((f) => !referenced.has(`/${f}`));
  const missingPhp = rootPhp.filter((f) => !referenced.has(`/${f}`));

  const report = {
    generated_at: new Date().toISOString(),
    root_dir: rootDir,
    totals: {
      html_files: rootHtml.length,
      php_files: rootPhp.length,
      referenced_paths: referenced.size
    },
    missing: {
      html: missingHtml,
      php: missingPhp
    }
  };

  const outPath = path.join(serverDir, 'legacy-root-coverage-report.json');
  fs.writeFileSync(outPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');

  // eslint-disable-next-line no-console
  console.log(`Legacy root coverage report: ${outPath}`);
  // eslint-disable-next-line no-console
  console.log(`HTML missing: ${missingHtml.length}, PHP missing: ${missingPhp.length}`);

  if (missingHtml.length || missingPhp.length) {
    process.exitCode = 1;
  }
}

main();
