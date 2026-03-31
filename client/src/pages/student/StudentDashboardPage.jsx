import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { FaClipboardCheck, FaFileLines, FaPlay, FaUser } from 'react-icons/fa6';
import { StudentNotificationBell } from '../../components/StudentNotificationBell.jsx';
import { StudentDashboardChatWidget } from '../../components/StudentDashboardChatWidget.jsx';
import { api } from '../../api/client.js';
import { resolveUploadUrl } from '../../api/assetUrl.js';
import { studentRoute } from '../../constants/studentRoutes.js';
import { useAuth } from '../../auth/useAuth.js';
import './StudentDashboardPage.css';

export function StudentDashboardPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, token } = useAuth();
  const initials = String(user?.full_name || 'S')
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((x) => x[0]?.toUpperCase() || '')
    .join('');

  const roleLabel = user?.role ? user.role.charAt(0).toUpperCase() + user.role.slice(1).toLowerCase() : 'Student';

  const [stats, setStats] = useState({
    examsCompleted: 0,
    activeExams: 0
  });
  const [profilePhotoUrl, setProfilePhotoUrl] = useState('');
  const [avatarImgFailed, setAvatarImgFailed] = useState(false);

  useEffect(() => {
    if (!token) return undefined;
    let cancelled = false;

    async function loadDashboard() {
      const email = user?.email || '';
      try {
        const [resultsRes, examsRes, profileRes] = await Promise.all([
          api.get('/results/student/exams'),
          api.get(`/exams?email_id=${encodeURIComponent(email)}`),
          api.get('/profile/me')
        ]);
        if (cancelled) return;
        const completed = (resultsRes.data?.exams || []).length;
        const active = (examsRes.data?.exams || []).length;
        setStats({ examsCompleted: completed, activeExams: active });
        setProfilePhotoUrl(String(profileRes.data?.profile?.profile_photo_url || '').trim());
      } catch {
        if (!cancelled) {
          setStats({ examsCompleted: 0, activeExams: 0 });
          setProfilePhotoUrl('');
        }
      }
    }

    void loadDashboard();
    return () => {
      cancelled = true;
    };
  }, [token, location.pathname, user?.email]);

  useEffect(() => {
    setAvatarImgFailed(false);
  }, [profilePhotoUrl]);

  return (
    <div className="student-dashboard-page">
      <header className="student-dashboard-navbar">
        <div className="student-dashboard-navbar-left">
          <h2 className="student-dashboard-navbar-title">Student Dashboard</h2>
          <p className="student-dashboard-navbar-sub">Welcome back!! Let&apos;s get started.</p>
        </div>
        <div className="student-dashboard-navbar-right">
          <StudentNotificationBell variant="dashboard" />
          <div className="student-dashboard-navbar-profile">
            <div className="student-dashboard-navbar-avatar" aria-hidden="true">
              {profilePhotoUrl && !avatarImgFailed ? (
                <img
                  src={resolveUploadUrl(profilePhotoUrl)}
                  alt=""
                  className="student-dashboard-navbar-avatar-img"
                  decoding="async"
                  onError={() => setAvatarImgFailed(true)}
                />
              ) : (
                initials || 'S'
              )}
            </div>
            <div className="student-dashboard-navbar-who">
              <span className="student-dashboard-navbar-name">{user?.full_name || 'Student'}</span>
              <span className="student-dashboard-navbar-role">{roleLabel}</span>
            </div>
          </div>
        </div>
      </header>

      <div className="student-dashboard-stat-grid">
        <div className="student-dashboard-stat-card student-dashboard-stat-blue">
          <div className="student-dashboard-stat-label">Exams Completed</div>
          <div className="student-dashboard-stat-value">{stats.examsCompleted}</div>
        </div>
        <div className="student-dashboard-stat-card student-dashboard-stat-green">
          <div className="student-dashboard-stat-label">Active Exams</div>
          <div className="student-dashboard-stat-value">{stats.activeExams}</div>
        </div>
      </div>

      <h3 className="student-dashboard-quick-title">Quick Actions</h3>
      <div className="student-dashboard-quick-grid">
        <button onClick={() => navigate(studentRoute('exam'))} className="student-dashboard-quick-card">
          <div className="student-dashboard-quick-icon student-dashboard-quick-blue"><FaPlay /></div>
          <div className="student-dashboard-quick-card-title">Take Exam</div>
          <div className="student-dashboard-quick-card-desc">Start a new exam session.</div>
        </button>
        <button onClick={() => navigate(studentRoute('exams'))} className="student-dashboard-quick-card">
          <div className="student-dashboard-quick-icon student-dashboard-quick-green"><FaFileLines /></div>
          <div className="student-dashboard-quick-card-title">Exam List</div>
          <div className="student-dashboard-quick-card-desc">View all available tests.</div>
        </button>
        <button onClick={() => navigate(studentRoute('results'))} className="student-dashboard-quick-card">
          <div className="student-dashboard-quick-icon student-dashboard-quick-orange"><FaClipboardCheck /></div>
          <div className="student-dashboard-quick-card-title">Results</div>
          <div className="student-dashboard-quick-card-desc">Check your scores and analytics.</div>
        </button>
        <button onClick={() => navigate(studentRoute('profile'))} className="student-dashboard-quick-card">
          <div className="student-dashboard-quick-icon student-dashboard-quick-purple"><FaUser /></div>
          <div className="student-dashboard-quick-card-title">Profile</div>
          <div className="student-dashboard-quick-card-desc">Update your personal details.</div>
        </button>
      </div>

      <StudentDashboardChatWidget />
    </div>
  );
}
