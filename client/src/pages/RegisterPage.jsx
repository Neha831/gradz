import React, { useEffect, useState } from 'react';
import { api } from '../api/client.js';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { FaBuildingColumns, FaCaretDown, FaEnvelope, FaKey, FaLock, FaPhone, FaUser, FaUserShield } from 'react-icons/fa6';
import { useAuth } from '../auth/useAuth.js';
import { BrandMark } from '../components/BrandMark.jsx';
import { ADMIN_BASE } from '../constants/adminRoutes.js';
import { STUDENT_BASE } from '../constants/studentRoutes.js';
import './RegisterPage.css';

export function RegisterPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { signIn, token, user } = useAuth();

  useEffect(() => {
    if (token && user) {
      navigate(user.role === 'admin' ? ADMIN_BASE : STUDENT_BASE, { replace: true });
    }
  }, [token, user, navigate]);

  const [role] = useState(() => (searchParams.get('role') === 'admin' ? 'admin' : 'student'));
  const [form, setForm] = useState({
    full_name: '',
    email_id: '',
    password: '',
    phone_number: '',
    college_name: '',
    course_branch: '',
    domain: '',
    confirm_password: '',
    security_question: '',
    security_answer: ''
  });
  const [loading, setLoading] = useState(false);
  const [formError, setFormError] = useState('');

  async function submit(e) {
    e.preventDefault();
    setFormError('');
    setLoading(true);
    try {
      if (form.password !== form.confirm_password) {
        setFormError('Passwords do not match');
        return;
      }
      const res = await api.post('/auth/register', { role, ...form });
      const token = String(res.data?.token || '').trim();
      if (!token) {
        setFormError(res.data?.message || 'Register failed');
        return;
      }
      if (!signIn(token)) {
        setFormError('Could not start your session. Check that the server has JWT_SECRET set in server/.env.');
        return;
      }
      if (role === 'admin') navigate(ADMIN_BASE);
      else navigate(STUDENT_BASE);
    } catch (err) {
      setFormError(err?.response?.data?.message || 'Register failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="register-page">
      <form onSubmit={submit} className="register-form-card">
        <BrandMark
          className="register-brand"
          logoClassName="register-brand-logo-img"
          wordmarkClassName="register-brand-wordmark"
          gradClassName="register-brand-grad"
          ezyClassName="register-brand-ezy"
        />
        <input type="hidden" value={role} />

        <div className="register-field register-gap">
          <label className="register-label"><FaBuildingColumns aria-hidden="true" /></label>
          <input
            value={form.college_name}
            onChange={(e) => setForm((p) => ({ ...p, college_name: e.target.value }))}
            placeholder="College Name"
            className="register-input"
          />
        </div>

        <div className="register-field register-gap">
          <label className="register-label"><FaUser aria-hidden="true" /></label>
          <input
            value={form.full_name}
            onChange={(e) => setForm((p) => ({ ...p, full_name: e.target.value }))}
            placeholder="Full Name"
            required
            className="register-input"
          />
        </div>

        <div className="register-field register-gap">
          <label className="register-label"><FaEnvelope aria-hidden="true" /></label>
          <input
            value={form.email_id}
            onChange={(e) => setForm((p) => ({ ...p, email_id: e.target.value }))}
            placeholder="Email id"
            type="email"
            required
            className="register-input"
          />
        </div>

        <div className="register-field register-gap">
          <label className="register-label"><FaLock aria-hidden="true" /></label>
          <input
            value={form.password}
            onChange={(e) => setForm((p) => ({ ...p, password: e.target.value }))}
            placeholder="Create Password"
            type="password"
            required
            className="register-input"
          />
        </div>

        <div className="register-field register-gap">
          <label className="register-label"><FaLock aria-hidden="true" /></label>
          <input
            value={form.confirm_password}
            onChange={(e) => setForm((p) => ({ ...p, confirm_password: e.target.value }))}
            placeholder="Confirm Password"
            type="password"
            required
            className="register-input"
          />
        </div>

        <div className="register-field register-gap">
          <label className="register-label"><FaPhone aria-hidden="true" /></label>
          <input
            value={form.phone_number}
            onChange={(e) => setForm((p) => ({ ...p, phone_number: e.target.value }))}
            placeholder="Mobile Number"
            className="register-input"
          />
        </div>

        <div className="register-field register-field-select register-gap">
          <label className="register-label"><FaUserShield aria-hidden="true" /></label>
          <select
            value={form.security_question}
            onChange={(e) => setForm((p) => ({ ...p, security_question: e.target.value }))}
            className="register-input register-select"
          >
            <option value="">Select a security question</option>
            <option value="What is your favorite teacher's name?">What is your favorite teacher's name?</option>
            <option value="Which city were you born in?">Which city were you born in?</option>
            <option value="What is your pet's name?">What is your pet's name?</option>
          </select>
          <span className="register-select-arrow"><FaCaretDown aria-hidden="true" /></span>
        </div>

        <div className="register-field register-gap">
          <label className="register-label"><FaKey aria-hidden="true" /></label>
          <input
            value={form.security_answer}
            onChange={(e) => setForm((p) => ({ ...p, security_answer: e.target.value }))}
            placeholder="Answer to security question"
            type="password"
            className="register-input"
          />
        </div>
        {formError ? (
          <div role="alert" className="register-error">
            {formError}
          </div>
        ) : null}

        <button type="submit" disabled={loading} className="register-submit">
          {loading ? 'Creating...' : 'Register'}
        </button>
        <div className="register-terms">
          By signing up, you agree to our <span>Terms &amp; Conditions</span> and
          <br />
          <span>Privacy Policy</span>.
        </div>
        <div className="register-help">
          Already have an account?{' '}
          <button type="button" onClick={() => navigate('/login')} className="register-link-btn">
            Login
          </button>
        </div>
      </form>
    </div>
  );
}

