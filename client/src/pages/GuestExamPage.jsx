import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api/client.js';
import { BrandMark } from '../components/BrandMark.jsx';
import './GuestExamPage.css';

const LIMITS = {
  examCodeMax: 64,
  studentNameMax: 120
};

function formatMMSS(totalSeconds) {
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${m}:${s < 10 ? '0' : ''}${s}`;
}

export function GuestExamPage() {
  const [step, setStep] = useState('validate');
  const [examCode, setExamCode] = useState('');
  const [studentName, setStudentName] = useState('');
  const [emailId, setEmailId] = useState('');
  const [exam, setExam] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [idx, setIdx] = useState(0);
  const [answers, setAnswers] = useState({});
  const [timeLeft, setTimeLeft] = useState(0);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const submittingRef = useRef(false);

  const current = questions[idx];
  const isLast = idx === questions.length - 1;
  const durationSeconds = useMemo(() => Number(exam?.duration || 0) * 60, [exam]);

  async function validateAndStart() {
    setMessage('');
    if (!examCode.trim() || !studentName.trim() || !emailId.trim()) {
      setMessage('Enter exam code, name and email.');
      return;
    }
    if (examCode.trim().length > LIMITS.examCodeMax) {
      setMessage(`Exam code must be at most ${LIMITS.examCodeMax} characters.`);
      return;
    }
    if (studentName.trim().length > LIMITS.studentNameMax) {
      setMessage(`Name must be at most ${LIMITS.studentNameMax} characters.`);
      return;
    }
    setLoading(true);
    try {
      const v = await api.post('/exams/guest/validate', { exam_code: examCode.trim() });
      if (!v.data?.success) throw new Error(v.data?.message || 'Invalid exam code');

      const res = await api.get(`/exams/guest/${encodeURIComponent(examCode.trim())}`);
      if (!res.data?.success) throw new Error(res.data?.message || 'Exam load failed');

      const qs = res.data.questions || [];
      const canon = String(qs[0]?.exam_code || '').trim();
      if (canon) setExamCode(canon);
      setExam(res.data.exam);
      setQuestions(qs);
      setIdx(0);
      setAnswers({});
      setTimeLeft(Number(res.data?.exam?.duration || 0) * 60);
      setStep('exam');
    } catch (err) {
      setMessage(err?.response?.data?.message || err?.message || 'Unable to start guest exam');
    } finally {
      setLoading(false);
    }
  }

  async function submitExam() {
    if (submittingRef.current) return;
    submittingRef.current = true;
    setLoading(true);
    setMessage('');
    try {
      const fd = new FormData();
      fd.append('exam_code', examCode.trim());
      fd.append('email_id', emailId.trim());
      fd.append('student_name', studentName.trim());
      fd.append('time_taken_seconds', String(Math.max(0, durationSeconds - timeLeft)));
      fd.append('is_guest_exam', 'true');
      for (const q of questions) {
        fd.append(`answers[${q.id}]`, String(answers[q.id] ?? 0));
      }

      const res = await api.post('/exams/guest/submit', fd);
      if (!res.data?.success) throw new Error(res.data?.message || 'Submission failed');
      setMessage(`Exam submitted. Score: ${res.data.obtained_marks}/${res.data.max_marks}`);
      setStep('done');
    } catch (err) {
      setMessage(err?.response?.data?.message || err?.message || 'Submission failed');
    } finally {
      setLoading(false);
      submittingRef.current = false;
    }
  }

  useEffect(() => {
    if (step !== 'exam' || !exam || !questions.length) return undefined;
    const id = setInterval(() => {
      setTimeLeft((x) => (x <= 0 ? 0 : x - 1));
    }, 1000);
    return () => clearInterval(id);
  }, [step, exam?.exam_code, questions.length]);

  useEffect(() => {
    if (step !== 'exam' || !exam || !questions.length) return;
    if (timeLeft > 0) return;
    void submitExam();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timeLeft]);

  return (
    <div className="guest-page">
      <header className="guest-page-header">
        <BrandMark
          className="guest-brand"
          logoClassName="guest-brand-logo-img"
          wordmarkClassName="guest-brand-wordmark"
          gradClassName="guest-brand-grad"
          ezyClassName="guest-brand-ezy"
        />
        <h2 className="guest-title">Guest Exam</h2>
      </header>
      {message ? <div className="guest-message">{message}</div> : null}

      {step === 'validate' ? (
        <div className="guest-card">
          <input maxLength={LIMITS.examCodeMax} value={examCode} onChange={(e) => setExamCode(e.target.value)} placeholder="Exam Code" className="guest-input" />
          <input maxLength={LIMITS.studentNameMax} value={studentName} onChange={(e) => setStudentName(e.target.value)} placeholder="Your Name" className="guest-input" />
          <input value={emailId} onChange={(e) => setEmailId(e.target.value)} type="email" placeholder="Your Email" className="guest-input" />
          <button onClick={() => void validateAndStart()} disabled={loading} className="guest-btn guest-btn-blue guest-full">
            {loading ? 'Starting...' : 'Validate & Start'}
          </button>
        </div>
      ) : null}

      {step === 'exam' && exam && questions.length > 0 && !current ? (
        <div className="guest-warning">
          This exam has no questions yet. Contact the organizer.
        </div>
      ) : null}

      {step === 'exam' && exam && current ? (
        <div className="guest-card">
          <div className="guest-header">
            <div className="guest-exam-title">{exam.exam_title}</div>
            <div className="guest-timer">Time Left: {formatMMSS(timeLeft)}</div>
          </div>
          <div className="guest-question">
            Q{idx + 1}: {current.question_text}
          </div>
          <div className="guest-options">
            {[1, 2, 3, 4].map((n) => (
              <label key={n} className="guest-option">
                <input type="radio" checked={(answers[current.id] ?? 0) === n} onChange={() => setAnswers((p) => ({ ...p, [current.id]: n }))} />
                <span>{current[`option_${n}`]}</span>
              </label>
            ))}
          </div>
          <div className="guest-footer">
            <button onClick={() => setIdx((x) => Math.max(0, x - 1))} disabled={idx === 0} className="guest-btn guest-btn-outline">Previous</button>
            {isLast ? (
              <button onClick={() => void submitExam()} disabled={loading} className="guest-btn guest-btn-green">
                {loading ? 'Submitting...' : 'Submit Exam'}
              </button>
            ) : (
              <button onClick={() => setIdx((x) => Math.min(questions.length - 1, x + 1))} className="guest-btn guest-btn-outline">Next</button>
            )}
          </div>
        </div>
      ) : null}

      {step === 'done' ? (
        <div className="guest-success">
          Guest exam completed successfully.
        </div>
      ) : null}

      <div className="guest-login-link-wrap">
        <Link to="/login" className="guest-login-link">
          Student / admin login
        </Link>
      </div>
    </div>
  );
}

