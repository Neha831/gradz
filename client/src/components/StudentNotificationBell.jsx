import React, { useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { FaBell } from 'react-icons/fa6';
import { api } from '../api/client.js';
import { studentRoute } from '../constants/studentRoutes.js';
import './StudentNotificationBell.css';

function formatExamTime(iso) {
  if (!iso) return '';
  try {
    const d = new Date(iso);
    return d.toLocaleString(undefined, {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  } catch {
    return '';
  }
}

export function StudentNotificationBell({ variant = 'header' }) {
  const navigate = useNavigate();
  const location = useLocation();
  const wrapRef = useRef(null);
  const [exams, setExams] = useState([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    try {
      const res = await api.get('/exams/notifications/today');
      setExams(Array.isArray(res.data?.exams) ? res.data.exams : []);
    } catch {
      setExams([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, [location.pathname]);

  useEffect(() => {
    if (!open) return undefined;
    function onDoc(e) {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [open]);

  const count = exams.length;
  const showNumericBadge = variant === 'dashboard' || count > 0;
  const badgeText = count > 9 ? '9+' : String(count);

  function goExam(code) {
    setOpen(false);
    navigate(`${studentRoute('exam')}?exam_code=${encodeURIComponent(code)}`);
  }

  return (
    <div className={`student-notify student-notify--${variant}`} ref={wrapRef}>
      <button
        type="button"
        className={`student-notify-btn${count > 0 ? ' student-notify-btn--has-count' : ''}${open ? ' student-notify-btn--open' : ''}`}
        aria-label={`Notifications, ${count} exam${count === 1 ? '' : 's'} today`}
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
      >
        <FaBell className="student-notify-icon" aria-hidden="true" />
        {showNumericBadge ? (
          <span
            className={`student-notify-badge${count === 0 ? ' student-notify-badge--zero' : ''}`}
            aria-hidden="true"
          >
            {badgeText}
          </span>
        ) : null}
      </button>
      {open ? (
        <div className="student-notify-panel" role="dialog" aria-label="Today's exam notifications">
          <div className="student-notify-panel-head">Today&apos;s exams</div>
          {loading ? <div className="student-notify-empty">Loading…</div> : null}
          {!loading && !exams.length ? (
            <div className="student-notify-empty">No exam notifications for today.</div>
          ) : null}
          {!loading && exams.length ? (
            <ul className="student-notify-list">
              {exams.map((e) => (
                <li key={e.exam_code}>
                  <button type="button" className="student-notify-item" onClick={() => goExam(e.exam_code)}>
                    <span className="student-notify-item-title">{e.exam_title || e.exam_code}</span>
                    <span className="student-notify-item-meta">
                      {e.exam_code}
                      {e.exam_date ? ` · ${formatExamTime(e.exam_date)}` : ''}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
