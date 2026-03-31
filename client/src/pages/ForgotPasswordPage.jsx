import React, { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { FaLock } from 'react-icons/fa6';
import { api } from '../api/client.js';
import { BrandMark } from '../components/BrandMark.jsx';
import './ForgotPasswordPage.css';

export function ForgotPasswordPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const navigateTimerRef = useRef(null);
  const roleHint = searchParams.get('role');

  const [role] = useState(() => (roleHint === 'admin' ? 'admin' : roleHint === 'student' ? 'student' : ''));
  const [email_id, setEmailId] = useState('');
  const [securityQuestion, setSecurityQuestion] = useState('');
  const [security_answer, setSecurityAnswer] = useState('');
  const [new_password, setNewPassword] = useState('');
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState({ ok: null, text: '' });

  useEffect(() => {
    return () => {
      if (navigateTimerRef.current) clearTimeout(navigateTimerRef.current);
    };
  }, []);

  async function fetchQuestion() {
    setLoading(true);
    setFeedback({ ok: null, text: '' });
    try {
      const payload = { email_id: email_id.trim() };
      if (role) payload.role = role;
      const res = await api.post('/auth/security-question', payload);
      setSecurityQuestion(res.data?.security_question || '');
      if (!res.data?.security_question) {
        setFeedback({
          ok: false,
          text: 'No security question for this account. Sign in and set one under Profile, or contact an admin.'
        });
      }
      if (res.data?.security_question) setStep(2);
    } catch (err) {
      setFeedback({ ok: false, text: err?.response?.data?.message || 'Failed to fetch security question.' });
      setSecurityQuestion('');
    } finally {
      setLoading(false);
    }
  }

  async function resetPassword(e) {
    e.preventDefault();
    if (!securityQuestion) {
      setFeedback({ ok: false, text: 'Use Get Question first to load your security question.' });
      return;
    }
    setLoading(true);
    setFeedback({ ok: null, text: '' });
    try {
      const payload = {
        email_id: email_id.trim(),
        security_answer: security_answer.trim(),
        new_password
      };
      if (role) payload.role = role;
      const res = await api.post('/auth/reset-password', payload);
      setFeedback({ ok: true, text: res.data?.message || 'Password reset successful. Redirecting to login…' });
      if (navigateTimerRef.current) clearTimeout(navigateTimerRef.current);
      navigateTimerRef.current = setTimeout(() => navigate('/login'), 1000);
    } catch (err) {
      setFeedback({ ok: false, text: err?.response?.data?.message || 'Password reset failed.' });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="forgot-page">
      <form onSubmit={resetPassword} className="forgot-card">
        <BrandMark
          className="forgot-brand"
          logoClassName="forgot-brand-logo-img"
          wordmarkClassName="forgot-brand-wordmark"
          gradClassName="forgot-brand-grad"
          ezyClassName="forgot-brand-ezy"
        />
        <div className="forgot-title">
          <FaLock className="forgot-title-icon" aria-hidden="true" /> Forgot Password
        </div>

        <label className="forgot-label">Registered Email</label>
        <input
          value={email_id}
          onChange={(e) => setEmailId(e.target.value)}
          placeholder="you@example.com"
          type="email"
          required
          className="forgot-input forgot-gap"
        />

        {step === 1 ? (
          <button type="button" onClick={() => void fetchQuestion()} disabled={loading} className="forgot-btn forgot-btn-primary forgot-full">
            {loading ? 'Please wait...' : 'Next'}
          </button>
        ) : null}

        {step === 2 && securityQuestion ? (
          <div className="forgot-question">
            {securityQuestion}
          </div>
        ) : null}

        {step === 2 ? (
          <>
            <input
              value={security_answer}
              onChange={(e) => setSecurityAnswer(e.target.value)}
              placeholder="Security Answer"
              required
              className="forgot-input forgot-gap"
            />
            <input
              value={new_password}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="New Password (min 6 chars)"
              type="password"
              required
              minLength={6}
              className="forgot-input forgot-gap"
            />
          </>
        ) : null}

        {feedback.text ? (
          <div
            role={feedback.ok === false ? 'alert' : 'status'}
            className={feedback.ok === true ? 'forgot-feedback forgot-feedback-ok' : 'forgot-feedback forgot-feedback-err'}
          >
            {feedback.text}
          </div>
        ) : null}

        {step === 2 ? (
          <>
            <button type="submit" disabled={loading} className="forgot-btn forgot-btn-success forgot-full">
              {loading ? 'Please wait...' : 'Reset Password'}
            </button>
            <button type="button" onClick={() => navigate('/login')} className="forgot-btn forgot-btn-outline forgot-full forgot-top">
              Back to Login
            </button>
            <div className="forgot-note">
              Need an account? <Link to="/register" className="forgot-link">Register</Link>
            </div>
          </>
        ) : null}
      </form>
    </div>
  );
}
