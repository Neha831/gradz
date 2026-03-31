import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../../api/client.js';
import { adminRoute } from '../../constants/adminRoutes.js';
import './ResultsPage.css';

const EXAM_CODE_MAX = 64;

export function AdminResultsPage() {
  const navigate = useNavigate();
  const [examCode, setExamCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [rows, setRows] = useState([]);
  const [message, setMessage] = useState('');
  const [pendingDeleteConfirm, setPendingDeleteConfirm] = useState(false);

  async function load() {
    setPendingDeleteConfirm(false);
    setMessage('');
    if (!examCode.trim()) {
      setMessage('Enter exam_code');
      return;
    }
    if (examCode.trim().length > EXAM_CODE_MAX) {
      setMessage(`exam_code must be at most ${EXAM_CODE_MAX} characters`);
      return;
    }

    setLoading(true);
    setMessage('');
    try {
      const res = await api.get(`/results/admin?exam_code=${encodeURIComponent(examCode.trim())}`);
      const canon = res.data?.exam_code;
      if (canon) setExamCode(canon);
      const list = res.data?.exam_results || [];
      setRows(list);
      if (!list.length) setMessage('No results found for this exam.');
    } catch (err) {
      setRows([]);
      setMessage(err?.response?.data?.message || 'Failed to load results.');
    } finally {
      setLoading(false);
    }
  }

  async function shareAll(shared) {
    if (!examCode.trim()) {
      setMessage('Enter exam_code first');
      return;
    }
    if (examCode.trim().length > EXAM_CODE_MAX) {
      setMessage(`exam_code must be at most ${EXAM_CODE_MAX} characters`);
      return;
    }
    try {
      const res = await api.post('/results/admin/share-all', {
        exam_code: examCode.trim(),
        shared
      });
      setMessage(res.data?.message || (shared ? 'Shared all' : 'Unshared all'));
      await load();
    } catch (err) {
      setMessage(err?.response?.data?.message || 'Failed to update share status');
    }
  }

  async function toggleRowShare(row) {
    try {
      const next = !row.shared;
      const res = await api.post('/results/admin/share-one', {
        exam_code: examCode.trim(),
        email_id: row.email_id,
        shared: next
      });
      setMessage(res.data?.message || (next ? 'Shared' : 'Unshared'));
      await load();
    } catch (err) {
      setMessage(err?.response?.data?.message || 'Failed to update share status');
    }
  }

  function exportCsv() {
    if (!examCode.trim()) {
      setMessage('Enter exam_code first');
      return;
    }
    if (examCode.trim().length > EXAM_CODE_MAX) {
      setMessage(`exam_code must be at most ${EXAM_CODE_MAX} characters`);
      return;
    }
    const token = localStorage.getItem('token');
    const base = import.meta.env.VITE_API_BASE || 'http://localhost:5000/api';
    const url = `${base}/results/admin/export?exam_code=${encodeURIComponent(examCode.trim())}`;
    fetch(url, {
      headers: token ? { Authorization: `Bearer ${token}` } : {}
    })
      .then(async (r) => {
        if (!r.ok) throw new Error('Export failed');
        const blob = await r.blob();
        const href = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = href;
        a.download = `exam_results_${examCode.trim()}.csv`;
        a.click();
        URL.revokeObjectURL(href);
      })
      .catch(() => setMessage('Failed to export CSV'));
  }

  async function deleteAllResults() {
    if (!examCode.trim()) {
      setMessage('Enter exam_code first');
      return;
    }
    if (examCode.trim().length > EXAM_CODE_MAX) {
      setMessage(`exam_code must be at most ${EXAM_CODE_MAX} characters`);
      return;
    }
    if (!pendingDeleteConfirm) {
      setPendingDeleteConfirm(true);
      setMessage(`Click Delete All Results again to confirm deleting all results for "${examCode.trim()}".`);
      return;
    }
    setPendingDeleteConfirm(false);
    try {
      const res = await api.delete('/results/admin', { data: { exam_code: examCode.trim() } });
      setMessage(res.data?.message || 'Deleted');
      setRows([]);
    } catch (err) {
      setMessage(err?.response?.data?.message || 'Failed to delete results');
    }
  }

  return (
    <div className="admin-results-page">
      <div className="admin-results-head">
        <h1 className="admin-results-title">Exam Results</h1>
        <button type="button" className="admin-results-back-students" onClick={() => navigate(adminRoute('students'))}>
          Back to Students
        </button>
      </div>

      <div className="admin-results-card admin-results-card-filter">
        <div className="admin-results-filter-row">
          <label className="admin-results-label" htmlFor="admin-exam-code-input">
            Enter Exam Code:
          </label>
          <input
            id="admin-exam-code-input"
            value={examCode}
            onChange={(e) => setExamCode(e.target.value)}
            maxLength={EXAM_CODE_MAX}
            className="admin-results-input"
            onKeyDown={(e) => e.key === 'Enter' && void load()}
          />
          <button
            type="button"
            onClick={() => void load()}
            disabled={loading}
            className="admin-results-btn admin-results-btn-blue admin-results-btn-primary"
          >
            {loading ? 'Loading…' : 'Show Results'}
          </button>
        </div>
      </div>

      {message ? <div className="admin-results-message">{message}</div> : null}

      {rows.length ? (
        <div className="admin-results-card">
          <div className="admin-results-secondary-toolbar">
            <button
              type="button"
              onClick={() => void shareAll(true)}
              className="admin-results-btn admin-results-btn-green"
            >
              Share All
            </button>
            <button
              type="button"
              onClick={() => void shareAll(false)}
              className="admin-results-btn admin-results-btn-red"
            >
              Unshare All
            </button>
            <button type="button" onClick={exportCsv} className="admin-results-btn admin-results-btn-blue">
              Export CSV
            </button>
            <button
              type="button"
              onClick={() => void deleteAllResults()}
              className="admin-results-btn admin-results-btn-dark-red"
            >
              Delete All Results
            </button>
          </div>
          <div className="admin-results-table-wrap">
            <table className="admin-results-table">
              <thead>
                <tr>
                  <th>Student</th>
                  <th>Email</th>
                  <th>College</th>
                  <th>Max</th>
                  <th>Obtained</th>
                  <th>Share</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r, i) => (
                  <tr key={`${r.email_id}-${i}`}>
                    <td className="admin-results-student">{r.student_name}</td>
                    <td>{r.email_id}</td>
                    <td>{r.college_name}</td>
                    <td className="admin-results-bold">{r.max_marks}</td>
                    <td className="admin-results-score">{r.obtained_marks}</td>
                    <td>
                      <button
                        onClick={() => void toggleRowShare(r)}
                        className={`admin-results-share ${r.shared ? 'admin-results-share-on' : 'admin-results-share-off'}`}
                      >
                        {r.shared ? 'Shared' : 'Share'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : null}
    </div>
  );
}

