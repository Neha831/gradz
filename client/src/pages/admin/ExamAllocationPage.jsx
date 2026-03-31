import React, { useState } from 'react';
import { api } from '../../api/client.js';
import './ExamAllocationPage.css';

const EXAM_CODE_MAX = 64;
const DOMAIN_MAX = 120;

const DOMAIN_OPTIONS = [
  'Web Development',
  'RPA',
  'Data Science',
  'Mobile App Development'
];

export function ExamAllocationPage() {
  const [examCode, setExamCode] = useState('');
  const [domain, setDomain] = useState('Web Development');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  async function submit(e) {
    e.preventDefault();
    setMessage('');
    if (!examCode.trim() || !domain.trim()) {
      setMessage('Provide test code and student domain');
      return;
    }
    if (examCode.trim().length > EXAM_CODE_MAX) {
      setMessage(`Test code must be at most ${EXAM_CODE_MAX} characters`);
      return;
    }
    if (domain.trim().length > DOMAIN_MAX) {
      setMessage(`Domain must be at most ${DOMAIN_MAX} characters`);
      return;
    }
    setLoading(true);
    setMessage('');
    try {
      const res = await api.post('/exams/allocate', { exam_code: examCode.trim(), domain: domain.trim() });
      setMessage(res.data?.message || 'Allocated');
    } catch (err) {
      setMessage(err?.response?.data?.message || 'Allocation failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="alloc-page">
      <h1 className="alloc-page-heading">Admin Dashboard</h1>

      <form onSubmit={submit} className="alloc-card">
        <h2 className="alloc-card-title">Allocate Exam to a Domain</h2>

        <div className="alloc-field">
          <label htmlFor="alloc-test-code" className="alloc-label">
            Test Code
          </label>
          <input
            id="alloc-test-code"
            maxLength={EXAM_CODE_MAX}
            value={examCode}
            onChange={(e) => setExamCode(e.target.value)}
            placeholder="Enter the code generated from 'Add New Exam'"
            className="alloc-input"
            autoComplete="off"
          />
        </div>

        <div className="alloc-field">
          <label htmlFor="alloc-domain" className="alloc-label">
            Select Student Domain
          </label>
          <select
            id="alloc-domain"
            value={domain}
            onChange={(e) => setDomain(e.target.value)}
            className="alloc-input alloc-select"
          >
            {DOMAIN_OPTIONS.map((d) => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
          </select>
        </div>

        <button type="submit" disabled={loading} className="alloc-submit">
          {loading ? 'Setting…' : 'Set Exam for Domain'}
        </button>

        {message ? <div className="alloc-msg">{message}</div> : null}
      </form>
    </div>
  );
}
