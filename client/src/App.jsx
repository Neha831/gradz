import React from 'react';
import { Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { useAuth } from './auth/useAuth.js';

import { HomePage } from './pages/HomePage.jsx';
import { LoginPage } from './pages/LoginPage.jsx';
import { RegisterPage } from './pages/RegisterPage.jsx';
import { ForgotPasswordPage } from './pages/ForgotPasswordPage.jsx';
import { GuestExamPage } from './pages/GuestExamPage.jsx';
import { AdminDashboardPage } from './pages/admin/AdminDashboardPage.jsx';
import { StudentDashboardPage } from './pages/student/StudentDashboardPage.jsx';
import { StudentExamListPage } from './pages/student/StudentExamListPage.jsx';
import { ExamsHubPage } from './pages/admin/ExamsHubPage.jsx';
import { SetupNewExamPage } from './pages/admin/SetupNewExamPage.jsx';
import { ManageQuestionsPage } from './pages/admin/ManageQuestionsPage.jsx';
import { ExamAllocationPage } from './pages/admin/ExamAllocationPage.jsx';
import { AdminResultsPage } from './pages/admin/ResultsPage.jsx';
import { SnapshotsPage } from './pages/admin/SnapshotsPage.jsx';
import { ContactPage } from './pages/ContactPage.jsx';
import { ExamStudentPage } from './pages/student/ExamStudentPage.jsx';
import { StudentResultsPage } from './pages/student/StudentResultsPage.jsx';
import { StudentResultAnalysisPage } from './pages/student/StudentResultAnalysisPage.jsx';
import { AddStudentPage } from './pages/admin/AddStudentPage.jsx';
import { StudentsHubPage } from './pages/admin/StudentsHubPage.jsx';
import { StudentsManagementPage } from './pages/admin/StudentsManagementPage.jsx';
import { ProfilePage } from './pages/student/ProfilePage.jsx';
import { FaqPage } from './pages/FaqPage.jsx';
import { AdminChatbotPage } from './pages/admin/AdminChatbotPage.jsx';
import { StudentChatbotPage } from './pages/student/StudentChatbotPage.jsx';

import { AdminLayout } from './layouts/AdminLayout.jsx';
import { StudentLayout } from './layouts/StudentLayout.jsx';
import { LEGACY_HTML_REDIRECTS } from './data/legacyHtmlRedirects.js';
import { ADMIN_BASE } from './constants/adminRoutes.js';
import { STUDENT_BASE } from './constants/studentRoutes.js';

function DefaultRedirect() {
  const { token, user } = useAuth();
  if (!token || !user) return <Navigate to="/" replace />;
  if (user.role === 'admin') return <Navigate to={ADMIN_BASE} replace />;
  return <Navigate to={STUDENT_BASE} replace />;
}

function Protected({ roles, children }) {
  const { user, token } = useAuth();

  if (!token) return <Navigate to="/login" replace />;
  if (!user) return <Navigate to="/login" replace />;
  if (roles && roles.length > 0 && !roles.includes(user.role)) {
    if (user.role === 'student') return <Navigate to={STUDENT_BASE} replace />;
    if (user.role === 'admin') return <Navigate to={ADMIN_BASE} replace />;
    return <Navigate to="/login" replace />;
  }

  return children;
}

export function App() {
  return (
    <Routes>
      {/* Legacy .html / .php entry points → see data/legacyHtmlRedirects.js */}
      {LEGACY_HTML_REDIRECTS.map(([from, to]) => (
        <Route key={from} path={from} element={<Navigate to={to} replace />} />
      ))}

      <Route path="/" element={<HomePage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route path="/forgot-password" element={<ForgotPasswordPage />} />
      <Route path="/guest-exam" element={<GuestExamPage />} />

      <Route
        path={ADMIN_BASE}
        element={
          <Protected roles={['admin']}>
            <AdminLayout />
          </Protected>
        }
      >
        <Route index element={<AdminDashboardPage />} />
        <Route path="questions" element={<Outlet />}>
          <Route index element={<ExamsHubPage />} />
          <Route path="setup" element={<SetupNewExamPage />} />
          <Route path="manage" element={<ManageQuestionsPage />} />
        </Route>
        <Route path="students" element={<Outlet />}>
          <Route index element={<StudentsHubPage />} />
          <Route path="add" element={<AddStudentPage />} />
          <Route path="manage" element={<StudentsManagementPage />} />
        </Route>
        <Route path="allocate" element={<ExamAllocationPage />} />
        <Route path="results" element={<AdminResultsPage />} />
        <Route path="snapshots" element={<SnapshotsPage />} />
        <Route path="profile" element={<ProfilePage />} />
        <Route path="faq" element={<FaqPage />} />
        <Route path="contact" element={<ContactPage />} />
        <Route path="chatbot" element={<AdminChatbotPage />} />
      </Route>

      <Route
        path={STUDENT_BASE}
        element={
          <Protected roles={['student']}>
            <StudentLayout />
          </Protected>
        }
      >
        <Route index element={<StudentDashboardPage />} />
        <Route path="exam" element={<ExamStudentPage />} />
        <Route path="exams" element={<StudentExamListPage />} />
        <Route path="results" element={<StudentResultsPage />} />
        <Route path="result-analysis" element={<StudentResultAnalysisPage />} />
        <Route path="profile" element={<ProfilePage />} />
        <Route path="faq" element={<FaqPage />} />
        <Route path="contact" element={<ContactPage />} />
        <Route path="chatbot" element={<StudentChatbotPage />} />
      </Route>

      <Route path="*" element={<DefaultRedirect />} />
    </Routes>
  );
}
