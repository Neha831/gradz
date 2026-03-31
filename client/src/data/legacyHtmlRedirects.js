import { ADMIN_BASE, adminRoute } from '../constants/adminRoutes.js';
import { STUDENT_BASE, studentRoute } from '../constants/studentRoutes.js';

/**
 * Old static HTML entry points → React Router paths.
 * Keep paths starting with "/" (no .html in `to` — use app routes).
 * Admin app lives under /admin/*
 */
export const LEGACY_HTML_REDIRECTS = [
  ['/1.html', '/login'],
  ['/index.html', '/'],
  ['/index2.html', '/'],
  ['/redirect_example.html', '/login'],
  ['/login.php', '/login'],
  ['/register.php', '/register'],
  ['/login.html', '/login'],
  ['/loginadmin.html', '/login'],
  ['/signup.html', '/register'],
  ['/signupadmin.html', '/register'],
  ['/guest_exam.html', '/guest-exam'],
  ['/forget_pass.html', '/forgot-password'],
  ['/contact.html', studentRoute('contact')],
  ['/contactus.html', studentRoute('contact')],
  ['/contactusadmin.html', adminRoute('contact')],
  ['/dash.html', ADMIN_BASE],
  ['/dashboard.html', ADMIN_BASE],
  ['/Exams.html', STUDENT_BASE],
  ['/Student.html', STUDENT_BASE],
  ['/exam_list_student.html', STUDENT_BASE],
  ['/exam_list_student_admin.html', ADMIN_BASE],
  ['/exam_setup.html', adminRoute('questions/setup')],
  ['/questions-crud.html', adminRoute('questions/manage')],
  ['/add_student.html', adminRoute('students/add')],
  ['/domain-allocation-form.html', adminRoute('allocate')],
  ['/import.html', `${adminRoute('questions/setup')}?tab=upload`],
  ['/profile.html', studentRoute('profile')],
  ['/faq.html', studentRoute('faq')],
  ['/faqadmin.html', adminRoute('faq')],
  ['/result_analysis.html', studentRoute('result-analysis')],
  ['/RESULT_STU.html', studentRoute('results')],
  ['/main_exam_student.html', studentRoute('exam')],
  ['/omr_exam_start.html', studentRoute('exam')],
  ['/Exam-student.html', studentRoute('exam')],
  ['/admin_chatbot_panel.html', adminRoute('chatbot')],
  ['/show_results.php', adminRoute('results')],
  ['/admin_snapshots.php', adminRoute('snapshots')]
];
