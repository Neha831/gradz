import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { FaEnvelope, FaEye, FaEyeSlash, FaLock } from 'react-icons/fa6';
import { api } from '../api/client.js';
import { useAuth } from '../auth/useAuth.js';
import { BrandMark } from '../components/BrandMark.jsx';
import { ADMIN_BASE } from '../constants/adminRoutes.js';
import { STUDENT_BASE } from '../constants/studentRoutes.js';
import './LoginPage.css';

export function LoginPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { signIn, token, user } = useAuth();
  const roleHint = searchParams.get('role');

  useEffect(() => {
    if (token && user) {
      navigate(user.role === 'admin' ? ADMIN_BASE : STUDENT_BASE, { replace: true });
    }
  }, [token, user, navigate]);

  const [role] = useState(() => (roleHint === 'admin' ? 'admin' : roleHint === 'student' ? 'student' : ''));
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formError, setFormError] = useState('');

  async function submit(e) {
    e.preventDefault();
    setFormError('');
    setLoading(true);
    try {
      const payload = { email_id: email.trim(), password };
      if (role) payload.role = role;
      const res = await api.post('/auth/login', payload);
      const data = res.data;
      const token = String(data?.token || '').trim();
      if (!token) {
        setFormError(data?.message || 'Login failed');
        return;
      }
      if (!signIn(token)) {
        setFormError('Could not read the session token. Check that the server has JWT_SECRET set in server/.env.');
        return;
      }
      if (data?.user?.role === 'admin') navigate(ADMIN_BASE);
      else navigate(STUDENT_BASE);
    } catch (err) {
      const msg =
        err?.response?.data?.message ||
        (err?.code === 'ERR_NETWORK' || err?.message === 'Network Error'
          ? 'Cannot reach the server. Is the API running (port 5000) and VITE_API_BASE correct in client/.env?'
          : null) ||
        err?.message ||
        'Login failed';
      setFormError(msg);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="login-page">
      <form onSubmit={submit} className="login-form-card">
        <BrandMark
          className="login-brand"
          logoClassName="login-brand-logo-img"
          wordmarkClassName="login-brand-wordmark"
          gradClassName="login-brand-grad"
          ezyClassName="login-brand-ezy"
        />
        <div className="login-title">Login to Your Account</div>
        <div className="login-subtitle">Access your exams and track progress</div>

        <input type="hidden" value={role} />

        <div className="login-field">
          <label className="login-label"><FaEnvelope aria-hidden="true" /></label>
          <input value={email} onChange={(e) => setEmail(e.target.value)} type="email" required
            placeholder="you@example.com"
            className="login-input" />
        </div>

        <div className="login-field login-field-password">
          <label className="login-label"><FaLock aria-hidden="true" /></label>
          <input value={password} onChange={(e) => setPassword(e.target.value)} type={showPassword ? 'text' : 'password'} required
            placeholder="••••••••"
            className="login-input" />
          <button
            type="button"
            onClick={() => setShowPassword((v) => !v)}
            className="login-password-toggle"
            aria-label={showPassword ? 'Hide password' : 'Show password'}
            title={showPassword ? 'Hide password' : 'Show password'}
          >
            {showPassword ? <FaEyeSlash aria-hidden="true" /> : <FaEye aria-hidden="true" />}
          </button>
        </div>

        {formError ? (
          <div role="alert" className="login-error">
            {formError}
          </div>
        ) : null}

        <button
          type="submit"
          disabled={loading}
          className="login-submit"
        >
          {loading ? 'Logging in...' : 'Login'}
        </button>

        <div className="login-help">
          <div className="login-help-row">
            <button
              type="button"
              onClick={() => navigate('/forgot-password')}
              className="login-link-btn login-link-inline"
            >
              Forgot Password?
            </button>
          </div>
          <div className="login-help-row">
            New here?{' '}
            <button
              type="button"
              onClick={() => navigate('/register')}
              className="login-link-btn"
            >
              Create an Account
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}

