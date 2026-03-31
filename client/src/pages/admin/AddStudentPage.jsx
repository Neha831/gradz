import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../../api/client.js';
import { adminRoute } from '../../constants/adminRoutes.js';
import './AddStudentPage.css';

export function AddStudentPage() {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    full_name: '',
    email_id: '',
    password: '',
    college_name: '',
    security_question: '',
    security_answer: ''
  });
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState('');

  async function submit(e) {
    e.preventDefault();
    setLoading(true);
    setMsg('');
    try {
      const res = await api.post('/users', {
        ...form,
        phone_number: '',
        course_branch: '',
        domain: ''
      });
      setMsg(res.data?.message || 'Student added');
      setForm({
        full_name: '',
        email_id: '',
        password: '',
        college_name: '',
        security_question: '',
        security_answer: ''
      });
    } catch (err) {
      setMsg(err?.response?.data?.message || 'Failed to add student');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="add-student-page">
      <div className="add-student-head">
        <h1 className="add-student-title">Add New Student</h1>
        <button type="button" className="add-student-back-hub" onClick={() => navigate(adminRoute('students'))}>
          Back to Students
        </button>
      </div>

      <form onSubmit={submit} className="add-student-card">
        <h2 className="add-student-card-heading">Enter Student Details</h2>

        <div className="add-student-row add-student-row-2">
          <div className="add-student-field">
            <label htmlFor="as-full-name">Full Name</label>
            <input
              id="as-full-name"
              value={form.full_name}
              onChange={(e) => setForm((p) => ({ ...p, full_name: e.target.value }))}
              className="add-student-input"
              required
              autoComplete="name"
            />
          </div>
          <div className="add-student-field">
            <label htmlFor="as-email">Email</label>
            <input
              id="as-email"
              value={form.email_id}
              onChange={(e) => setForm((p) => ({ ...p, email_id: e.target.value }))}
              type="email"
              className="add-student-input"
              required
              autoComplete="email"
            />
          </div>
        </div>

        <div className="add-student-field add-student-field-full">
          <label htmlFor="as-password">Password</label>
          <input
            id="as-password"
            value={form.password}
            onChange={(e) => setForm((p) => ({ ...p, password: e.target.value }))}
            type="password"
            className="add-student-input"
            required
            minLength={6}
            autoComplete="new-password"
          />
        </div>

        <div className="add-student-field add-student-field-full">
          <label htmlFor="as-college">College Name</label>
          <input
            id="as-college"
            value={form.college_name}
            onChange={(e) => setForm((p) => ({ ...p, college_name: e.target.value }))}
            className="add-student-input"
            autoComplete="organization"
          />
        </div>

        <div className="add-student-row add-student-row-2">
          <div className="add-student-field">
            <label htmlFor="as-sec-q">Security Question</label>
            <input
              id="as-sec-q"
              value={form.security_question}
              onChange={(e) => setForm((p) => ({ ...p, security_question: e.target.value }))}
              className="add-student-input"
            />
          </div>
          <div className="add-student-field">
            <label htmlFor="as-sec-a">Security Answer</label>
            <input
              id="as-sec-a"
              value={form.security_answer}
              onChange={(e) => setForm((p) => ({ ...p, security_answer: e.target.value }))}
              className="add-student-input"
              autoComplete="off"
            />
          </div>
        </div>

        <div className="add-student-actions">
          <button type="submit" disabled={loading} className="add-student-submit">
            {loading ? 'Adding…' : 'Add Student'}
          </button>
        </div>
      </form>

      {msg ? <div className="add-student-msg">{msg}</div> : null}
    </div>
  );
}
