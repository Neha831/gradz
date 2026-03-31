import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FaArrowLeftLong } from 'react-icons/fa6';
import { api } from '../../api/client.js';
import { studentRoute } from '../../constants/studentRoutes.js';
import { useAuth } from '../../auth/useAuth.js';
import './StudentExamListPage.css';

export function StudentExamListPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [domain, setDomain] = useState('Web Development');

  async function load() {
    setLoading(true);
    try {
      const prof = await api.get('/profile/me');
      const d = prof.data?.profile?.domain;
      if (d) setDomain(d);
      const res = await api.get(
        `/exams?domain=${encodeURIComponent(d || domain)}&email_id=${encodeURIComponent(user?.email || '')}`
      );
      setRows(res.data?.exams || []);
    } catch {
      setRows([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="student-exam-list-page">
      <div className="student-exam-list-head">
        <div>
          <h2 className="student-exam-list-title">Exam List</h2>
          <div className="student-exam-list-subtitle">
            All available and upcoming exams are listed here.
          </div>
        </div>
        <button onClick={() => navigate(-1)} className="student-exam-list-back" aria-label="Back">
          <FaArrowLeftLong aria-hidden="true" />
        </button>
      </div>

      <div className="student-exam-list-card">
        <div className="student-exam-list-table-wrap">
          <table className="student-exam-list-table">
            <thead>
              <tr>
                <th>Exam Title</th>
                <th>Exam Code</th>
                <th>Date</th>
                <th>Duration</th>
                <th>Status</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((e, i) => (
                <tr key={`${e.exam_code}-${i}`}>
                  <td>{e.exam_title}</td>
                  <td>{e.exam_code}</td>
                  <td>{e.exam_date || '-'}</td>
                  <td>{e.duration ? `${e.duration} min` : '-'}</td>
                  <td>Available</td>
                  <td>
                    <button
                      onClick={() =>
                        navigate(`${studentRoute('exam')}?exam_code=${encodeURIComponent(e.exam_code)}`)
                      }
                      className="student-exam-list-start"
                    >
                      Start
                    </button>
                  </td>
                </tr>
              ))}
              {!rows.length ? (
                <tr>
                  <td colSpan={6} className="student-exam-list-empty">
                    {loading ? 'Loading...' : 'No remaining exams!'}
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

