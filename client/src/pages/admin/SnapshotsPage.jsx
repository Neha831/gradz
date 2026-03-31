import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../../api/client.js';
import { adminRoute } from '../../constants/adminRoutes.js';
import './SnapshotsPage.css';

function fileBase() {
  return import.meta.env.VITE_API_BASE?.replace('/api', '') || 'http://localhost:5000';
}

export function SnapshotsPage() {
  const navigate = useNavigate();
  const [examCode, setExamCode] = useState('');
  const [images, setImages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState('');

  async function viewSnapshots(e) {
    e.preventDefault();
    setMsg('');
    const c = examCode.trim();
    if (!c) {
      setMsg('Please enter an exam code.');
      return;
    }
    setLoading(true);
    try {
      const res = await api.get(`/snapshots/by-exam/${encodeURIComponent(c)}/images`);
      setImages(res.data?.images || []);
      if (!(res.data?.images || []).length) setMsg('No snapshots found for this exam code.');
    } catch {
      setImages([]);
      setMsg('Could not load snapshots.');
    } finally {
      setLoading(false);
    }
  }

  async function deleteByExam() {
    const c = examCode.trim();
    if (!c) {
      setMsg('Enter an exam code first.');
      return;
    }
    if (!window.confirm(`Delete all snapshot files for exam "${c}" for every student? This cannot be undone.`)) return;
    setMsg('');
    try {
      const res = await api.delete('/snapshots/by-exam', { data: { exam_code: c } });
      setMsg(res.data?.message || 'Deleted.');
      setImages([]);
    } catch (err) {
      setMsg(err?.response?.data?.message || 'Delete failed.');
    }
  }

  return (
    <div className="snapshots-page">
      <div className="snapshots-head">
        <h1 className="snapshots-title">View Exam Snapshots</h1>
        <button type="button" className="snapshots-back-students" onClick={() => navigate(adminRoute('students'))}>
          Back to Students
        </button>
      </div>

      <form className="snapshots-card snapshots-card-filter" onSubmit={(e) => void viewSnapshots(e)}>
        <div className="snapshots-filter-row">
          <label className="snapshots-label" htmlFor="snap-exam-code">
            Enter Exam Code:
          </label>
          <input
            id="snap-exam-code"
            value={examCode}
            onChange={(e) => setExamCode(e.target.value)}
            className="snapshots-input"
            required
          />
          <button type="submit" disabled={loading} className="snapshots-btn snapshots-btn-blue">
            {loading ? 'Loading…' : 'View Snapshots'}
          </button>
        </div>
      </form>

      <div className="snapshots-card snapshots-card-actions">
        <button type="button" className="snapshots-btn snapshots-btn-danger" onClick={() => void deleteByExam()}>
          Delete Snapshots by Exam Code
        </button>
      </div>

      {msg ? <div className="snapshots-msg">{msg}</div> : null}

      <div className="snapshots-images">
        {images.map((img) => {
          const fullUrl = `${fileBase()}${img.url}`;
          return (
            <div key={`${img.student}-${img.filename}`} className="snapshots-image-card">
              <img src={fullUrl} alt={img.filename} className="snapshots-image" />
              <div className="snapshots-image-meta">
                <span className="snapshots-image-name">{img.filename}</span>
                <span className="snapshots-image-student">{img.student}</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
