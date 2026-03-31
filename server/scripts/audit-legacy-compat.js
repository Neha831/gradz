import fs from 'fs';
import path from 'path';

const workspaceRoot = path.resolve(process.cwd(), '..');
const reportPath = path.resolve(process.cwd(), 'legacy-compat-report.json');

const ignoreDirs = new Set(['node_modules', '.git', 'client/dist', 'server/node_modules', '.cursor']);

const mappedLegacyEndpoints = new Set([
  '/login.php',
  '/loginadmin.php',
  '/loginstudent.php',
  '/register.php',
  '/get_user_profile.php',
  '/get_profile.php',
  '/check_profile.php',
  '/check_exam_code.php',
  '/fetch_exam.php',
  '/submit_exam.php',
  '/save_exam.php',
  '/allocate_exam.php',
  '/fetch_questions.php',
  '/delete_question.php',
  '/delete_exams.php',
  '/update_question.php',
  '/upload_excel.php',
  '/add_student.php',
  '/view_student.php',
  '/export_students.php',
  '/send-email.php',
  '/mail.php',
  '/submit_student_feedback.php',
  '/guest_exam_validate.php',
  '/start_exam.php',
  '/fetch_chatbot_responses.php',
  '/save_chatbot_responses.php',
  '/get_exam_list.php',
  '/get_exam_notifications.php',
  '/get_student_stats.php',
  '/get_teacher_stats.php',
  '/get_result_analysis.php',
  '/show_results.php',
  '/show_result.php',
  '/show_student_result.php',
  '/fetch_results.php',
  '/resultdashboard.php',
  '/result_detail.php',
  '/share_result.php',
  '/download_result.php',
  '/check_session.php',
  '/logout.php',
  '/logoutadmin.php',
  '/db_config.php',
  '/dashboard.php',
  '/crud.php',
  '/admin_view.php',
  '/old.php',
  '/grant_permissions.php',
  '/log_ai_violation.php',
  '/api/ping.php',
  '/log_tab_switch.php',
  '/upload_snapshot.php',
  '/admin_snapshots.php',
  '/view_exam_snapshots.php',
  '/reset_password.php',
  '/process_forgot_password.php',
  '/update_Student_stats.php',
  '/update_profile_minimal.php',
  '/update_profile_test.php',
  '/delete_exam_questions.php',
  '/edit_student.php',
  '/delete_student.php',
  '/evaluate.php',
  '/get_security_questions.php',
  '/apply.php',
  '/internship-apply.php',
  '/api/gradezy_results.php',
  '/cashify/default.php',
  '/pg/default.php',
  '/pgm/default.php',
  '/skillup/default.php'
]);

const nonActionablePatterns = [
  /^\/\/.+\.php$/i,
  /^\/PHPMailer\/.+\.php$/i,
  /^\/vendor\/autoload\.php$/i,
  /^\/edu\/.+\.php$/i,
  /^\/net\/.+\.php$/i,
  /^\/mb-encode-mimeheader\.php$/i,
  /^\/mhash\.php$/i,
  /^\/pathinfo\.php$/i
];

function shouldSkip(p) {
  const normalized = p.replace(/\\/g, '/');
  for (const d of ignoreDirs) {
    if (normalized.includes(`/${d}/`) || normalized.endsWith(`/${d}`)) return true;
  }
  return false;
}

function walk(dir, out = []) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const e of entries) {
    const abs = path.join(dir, e.name);
    if (shouldSkip(abs)) continue;
    if (e.isDirectory()) {
      walk(abs, out);
    } else if (e.isFile()) {
      if (/\.(html|php|js|jsx|ts|tsx)$/i.test(e.name)) out.push(abs);
    }
  }
  return out;
}

function extractPhpEndpoints(text) {
  const re = /([a-zA-Z0-9_/-]+\.php(?:\?[^\s"'`)]*)?)/g;
  const found = [];
  let m;
  while ((m = re.exec(text)) !== null) {
    found.push(m[1]);
  }
  return found;
}

function normalizeEndpoint(ep) {
  const noQuery = ep.split('?')[0];
  const withSlash = noQuery.startsWith('/') ? noQuery : `/${noQuery}`;
  return withSlash.replace(/\\/g, '/');
}

function isNonActionable(endpoint) {
  return nonActionablePatterns.some((p) => p.test(endpoint));
}

function run() {
  const files = walk(workspaceRoot);
  const hits = new Map(); // endpoint => Set(files)

  for (const f of files) {
    let text = '';
    try {
      text = fs.readFileSync(f, 'utf8');
    } catch {
      continue;
    }
    const endpoints = extractPhpEndpoints(text);
    for (const ep of endpoints) {
      const n = normalizeEndpoint(ep);
      if (!hits.has(n)) hits.set(n, new Set());
      hits.get(n).add(path.relative(workspaceRoot, f).replace(/\\/g, '/'));
    }
  }

  const allReferenced = Array.from(hits.keys()).sort();
  const mapped = allReferenced.filter((e) => mappedLegacyEndpoints.has(e));
  const unmapped = allReferenced.filter((e) => !mappedLegacyEndpoints.has(e));
  const non_actionable_unmapped = unmapped.filter((e) => isNonActionable(e));
  const actionable_unmapped = unmapped.filter((e) => !isNonActionable(e));

  const report = {
    scanned_files: files.length,
    referenced_php_endpoints: allReferenced.length,
    mapped_count: mapped.length,
    unmapped_count: unmapped.length,
    actionable_unmapped_count: actionable_unmapped.length,
    non_actionable_unmapped_count: non_actionable_unmapped.length,
    mapped,
    unmapped,
    actionable_unmapped,
    non_actionable_unmapped,
    references: Object.fromEntries(
      allReferenced.map((e) => [e, Array.from(hits.get(e) || [])])
    )
  };

  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2), 'utf8');

  console.log('========== Legacy Compatibility Audit ==========');
  console.log(`Scanned files: ${report.scanned_files}`);
  console.log(`Referenced .php endpoints: ${report.referenced_php_endpoints}`);
  console.log(`Mapped: ${report.mapped_count}`);
  console.log(`Unmapped: ${report.unmapped_count}`);
  console.log(`Actionable unmapped: ${report.actionable_unmapped_count}`);
  console.log(`Non-actionable unmapped: ${report.non_actionable_unmapped_count}`);
  if (actionable_unmapped.length) {
    console.log('Actionable unmapped endpoints:');
    actionable_unmapped.forEach((u) => console.log(` - ${u}`));
  }
  if (non_actionable_unmapped.length) {
    console.log('Non-actionable library/internal references:');
    non_actionable_unmapped.forEach((u) => console.log(` - ${u}`));
  }
  console.log(`Report: ${reportPath}`);
  console.log('===============================================');
}

run();

