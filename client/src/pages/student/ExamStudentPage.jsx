import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { FaArrowLeftLong, FaCamera, FaCheck, FaXmark } from 'react-icons/fa6';
import { api } from '../../api/client.js';
import { BrandMark } from '../../components/BrandMark.jsx';
import { STUDENT_BASE } from '../../constants/studentRoutes.js';
import { useAuth } from '../../auth/useAuth.js';
import './ExamStudentPage.css';

function formatMMSS(totalSeconds) {
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${m}:${s < 10 ? '0' : ''}${s}`;
}

const STUDENT_NAME_MAX = 120;

const TERMS_INTRO =
  'By participating in this online examination, you agree to the following terms and conditions:';

const TERMS_POINTS = [
  'Identity may be verified using your webcam for proctoring purposes.',
  'Academic integrity is required. Cheating, copying, or unauthorized assistance is prohibited.',
  'Webcam proctoring may include audio and video recording during the exam.',
  'Do not switch browser tabs, minimize the window, or leave the exam environment without authorization.',
  'Complete the exam in a quiet, private room suitable for online testing.',
  'The exam has a fixed time limit. Your answers may be submitted automatically when time expires.',
  'You are responsible for a stable internet connection and working webcam.',
  'All submissions are final unless your instructor or administrator allows otherwise.',
  'Violations may result in disqualification or other consequences as per institutional policy.',
  'Your data will be handled in accordance with applicable privacy laws and platform policy.'
];

export function ExamStudentPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const [examCodeInput, setExamCodeInput] = useState(() => searchParams.get('exam_code') || '');
  const examCode = String(examCodeInput || '').trim();

  const previewRef = useRef(null);
  const streamRef = useRef(null);
  const examCameraRef = useRef(null);
  const snapshotTimerRef = useRef(null);

  const [studentName, setStudentName] = useState('');
  const [emailId] = useState(() => user?.email || '');

  const [exam, setExam] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [idx, setIdx] = useState(0);
  const [answers, setAnswers] = useState({});

  /** Step 1: enter code. Step 2: terms + camera. */
  const [preExamStep, setPreExamStep] = useState('verify');
  const [pendingPayload, setPendingPayload] = useState(null);
  const [verifyLoading, setVerifyLoading] = useState(false);

  const [cameraOk, setCameraOk] = useState(false);
  const [cameraError, setCameraError] = useState('');

  const [timeLeft, setTimeLeft] = useState(0);
  const durationSeconds = useMemo(() => (exam?.duration ? exam.duration * 60 : 0), [exam]);

  const [submitting, setSubmitting] = useState(false);
  const [feedbackOpen, setFeedbackOpen] = useState(false);
  const [uiMessage, setUiMessage] = useState('');
  const [feedback, setFeedback] = useState({
    q1_experience: '',
    q2_ui: '',
    q3_technical: '',
    q4_proctoring: ''
  });

  const nameLocked = Boolean(String(user?.full_name || '').trim());

  useEffect(() => {
    if (!examCode) return;
    setStudentName(user?.full_name || '');
  }, [examCode, user]);

  useEffect(() => {
    setPendingPayload(null);
  }, [examCodeInput]);

  async function startCameraCheck() {
    setCameraOk(false);
    setCameraError('');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 640 }, height: { ideal: 480 }, facingMode: 'user' },
        audio: false
      });
      streamRef.current = stream;
      if (previewRef.current) {
        previewRef.current.srcObject = stream;
        await previewRef.current.play();
        const ok = previewRef.current.videoWidth > 0 && previewRef.current.videoHeight > 0;
        setCameraOk(ok);
        if (!ok) setCameraError('Camera is not providing video feed');
      } else {
        setCameraError('Video element missing');
      }
    } catch (err) {
      setCameraError(err?.message || 'Unable to access camera');
      setCameraOk(false);
    }
  }

  function stopCamera() {
    const s = streamRef.current;
    if (s) {
      s.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    if (previewRef.current) previewRef.current.srcObject = null;
  }

  useEffect(() => {
    if (preExamStep === 'terms') {
      void startCameraCheck();
    } else {
      stopCamera();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [preExamStep]);

  useEffect(() => {
    return () => {
      if (snapshotTimerRef.current) {
        clearInterval(snapshotTimerRef.current);
        snapshotTimerRef.current = null;
      }
      stopCamera();
    };
  }, []);

  useEffect(() => {
    if (!examCode || !exam || feedbackOpen) return;
    function onVisibilityChange() {
      if (document.hidden) {
        api
          .post('/proctor/tab-switch', {
            exam_code: examCode,
            event_type: 'tab_switch',
            note: 'User switched tab/window during exam'
          })
          .catch(() => {});
      }
    }
    document.addEventListener('visibilitychange', onVisibilityChange);
    return () => document.removeEventListener('visibilitychange', onVisibilityChange);
  }, [examCode, exam, feedbackOpen]);

  useEffect(() => {
    if (!exam || !questions.length) return;
    if (submitting || feedbackOpen) return;

    const interval = setInterval(() => {
      setTimeLeft((x) => (x <= 0 ? 0 : x - 1));
    }, 1000);
    return () => clearInterval(interval);
  }, [exam, questions.length, submitting, feedbackOpen]);

  async function startExamCameraAndSnapshots() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 640 }, height: { ideal: 480 }, facingMode: 'user' },
        audio: false
      });
      streamRef.current = stream;

      if (examCameraRef.current) {
        examCameraRef.current.srcObject = stream;
        await examCameraRef.current.play();
      }

      if (snapshotTimerRef.current) clearInterval(snapshotTimerRef.current);
      snapshotTimerRef.current = setInterval(() => {
        void uploadSnapshot();
      }, 10000);
    } catch {
      // Snapshot upload is best-effort
    }
  }

  function stopExamCameraAndSnapshots() {
    if (snapshotTimerRef.current) {
      clearInterval(snapshotTimerRef.current);
      snapshotTimerRef.current = null;
    }
    stopCamera();
  }

  async function uploadSnapshot() {
    const video = examCameraRef.current;
    if (!video || video.readyState < 2) return;

    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.drawImage(video, 0, 0);

    const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/jpeg', 0.8));
    if (!blob) return;

    const fd = new FormData();
    fd.append('webcam_snapshot', blob, 'snapshot.jpg');
    fd.append('student_name', studentName.trim() || user?.full_name || 'Student');
    fd.append('email_id', emailId);
    fd.append('exam_code', examCode);

    try {
      await api.post('/snapshots/upload', fd);
    } catch {
      // best-effort
    }
  }

  useEffect(() => {
    if (!exam || !questions.length) return;
    if (timeLeft <= 0 && !submitting && !feedbackOpen) {
      void submitExam(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timeLeft]);

  function closeTermsBackToVerify() {
    stopCamera();
    setCameraOk(false);
    setCameraError('');
    setPendingPayload(null);
    setPreExamStep('verify');
  }

  function handleHeaderBack() {
    if (preExamStep === 'terms') {
      closeTermsBackToVerify();
    } else {
      navigate(-1);
    }
  }

  async function verifyAndProceed() {
    setUiMessage('');
    if (!examCode) {
      setUiMessage('Please enter the exam code.');
      return;
    }
    if (!emailId) {
      setUiMessage('Email is missing. Please update your profile.');
      return;
    }
    if (studentName.trim().length > STUDENT_NAME_MAX) {
      setUiMessage(`Student name must be at most ${STUDENT_NAME_MAX} characters.`);
      return;
    }
    setVerifyLoading(true);
    try {
      const res = await api.get(`/exams/${encodeURIComponent(examCode)}`);
      const payload = res.data;
      if (!payload?.success) {
        setUiMessage(payload?.message || 'Exam not found or unavailable.');
        return;
      }
      const qs = payload.questions || [];
      if (!qs.length) {
        setUiMessage('This exam has no questions yet.');
        return;
      }
      const canonicalCode = String(payload.exam?.exam_code || qs[0]?.exam_code || '').trim();
      if (canonicalCode) setExamCodeInput(canonicalCode);
      setPendingPayload({ exam: payload.exam, questions: qs });
      setPreExamStep('terms');
    } catch (err) {
      setUiMessage(err?.response?.data?.message || err?.message || 'Could not verify exam code.');
    } finally {
      setVerifyLoading(false);
    }
  }

  async function acceptAndStart() {
    setUiMessage('');
    if (!cameraOk) {
      setUiMessage('Please allow camera access and wait until verification succeeds before starting.');
      return;
    }
    if (!pendingPayload?.exam || !pendingPayload?.questions?.length) {
      setUiMessage('Exam data is missing. Go back and verify your exam code again.');
      return;
    }
    if (!examCode) {
      setUiMessage('Exam code missing');
      return;
    }
    if (studentName.trim().length > STUDENT_NAME_MAX) {
      setUiMessage(`Student name must be at most ${STUDENT_NAME_MAX} characters.`);
      return;
    }
    stopCamera();

    setExam(pendingPayload.exam);
    setQuestions(pendingPayload.questions);
    setIdx(0);
    setAnswers({});
    setTimeLeft(pendingPayload.exam.duration * 60);
    await startExamCameraAndSnapshots();
  }

  function currentQ() {
    return questions[idx];
  }

  async function submitExam(auto = false) {
    if (submitting) return;
    setUiMessage('');
    setSubmitting(true);
    const timeTakenSeconds = Math.max(0, durationSeconds - timeLeft);

    try {
      const fd = new FormData();
      fd.append('exam_code', examCode);
      fd.append('email_id', emailId);
      fd.append('student_name', studentName.trim() || 'Student');
      fd.append('time_taken_seconds', String(timeTakenSeconds));
      fd.append('is_guest_exam', 'false');

      for (const q of questions) {
        fd.append(`answers[${q.id}]`, String(answers[q.id] ?? 0));
      }

      const res = await api.post('/exams/submit', fd);
      const data = res.data;
      if (!data?.success) throw new Error(data?.message || 'Submission failed');

      if (!auto) setUiMessage(data.message || 'Exam submitted successfully.');
      stopExamCameraAndSnapshots();
      setFeedbackOpen(true);
    } catch (err) {
      setUiMessage(err?.response?.data?.message || err?.message || 'Submission failed');
    } finally {
      setSubmitting(false);
    }
  }

  async function submitFeedback() {
    setUiMessage('');
    if (!feedback.q1_experience || !feedback.q2_ui || !feedback.q3_technical || !feedback.q4_proctoring) {
      setUiMessage('Please answer all feedback questions.');
      return;
    }

    const payload = {
      student_name: studentName.trim() || 'Student',
      email_id: emailId,
      exam_code: examCode,
      ...feedback,
      is_guest_exam: 'false'
    };

    const res = await api.post('/feedback/submit', payload);
    if (!res.data?.success) {
      setUiMessage(res.data?.message || 'Feedback submit failed');
      return;
    }
    setUiMessage('Thank you for your valuable feedback!');
    navigate(STUDENT_BASE);
  }

  const q = currentQ();
  const isLast = idx === questions.length - 1;

  const canStartExam = cameraOk && Boolean(pendingPayload?.exam);

  return (
    <div className="exam-student-page">
      <div className="exam-student-head">
        <button type="button" onClick={() => handleHeaderBack()} className="exam-student-back" aria-label="Back">
          <FaArrowLeftLong aria-hidden="true" />
        </button>
      </div>
      {uiMessage ? <div className="exam-student-message">{uiMessage}</div> : null}

      {!exam && !feedbackOpen && preExamStep === 'verify' ? (
        <div className="exam-student-overlay">
          <div className="exam-student-modal exam-student-modal--step1">
            <BrandMark
              className="exam-student-brand"
              logoClassName="exam-student-brand-logo"
              wordmarkClassName="exam-student-brand-wordmark"
              gradClassName="exam-student-brand-grad"
              ezyClassName="exam-student-brand-ezy"
            />
            <div className="exam-student-verify-card">
              <label className="exam-student-label" htmlFor="exam-student-name">
                Student Name: (Auto-filled)
              </label>
              <input
                id="exam-student-name"
                maxLength={STUDENT_NAME_MAX}
                value={studentName}
                onChange={(e) => setStudentName(e.target.value)}
                disabled={nameLocked}
                className={`exam-student-input${nameLocked ? ' exam-student-input-disabled' : ''}`}
              />
              <label className="exam-student-label" htmlFor="exam-student-email">
                Email ID: (Auto-filled)
              </label>
              <input
                id="exam-student-email"
                value={emailId}
                disabled
                className="exam-student-input exam-student-input-disabled"
              />
              <label className="exam-student-label" htmlFor="exam-student-code">
                Exam Code:
              </label>
              <input
                id="exam-student-code"
                value={examCodeInput}
                onChange={(e) => setExamCodeInput(e.target.value)}
                placeholder="Enter the code provided"
                className="exam-student-input"
                autoComplete="off"
              />
              <button
                type="button"
                onClick={() => void verifyAndProceed()}
                disabled={verifyLoading || !emailId || !examCode}
                className={`exam-student-btn exam-student-btn-full exam-student-btn-verify-top ${
                  verifyLoading || !emailId || !examCode ? 'exam-student-btn-disabled' : 'exam-student-btn-blue'
                }`}
              >
                {verifyLoading ? 'Verifying…' : 'Verify & Proceed'}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {!exam && !feedbackOpen && preExamStep === 'terms' ? (
        <div className="exam-student-overlay exam-student-overlay--terms">
          <div className="exam-student-modal exam-student-modal--terms">
            <div className="exam-student-modal-head">
              <h2 className="exam-student-modal-title">Terms and Conditions</h2>
              <button
                type="button"
                className="exam-student-close"
                onClick={() => closeTermsBackToVerify()}
                aria-label="Close and go back"
              >
                <FaXmark aria-hidden="true" />
              </button>
            </div>
            <p className="exam-student-terms-intro">{TERMS_INTRO}</p>
            <ol className="exam-student-terms-list">
              {TERMS_POINTS.map((text, i) => (
                <li key={i}>{text}</li>
              ))}
            </ol>
            <p className="exam-student-terms-confirm">
              By clicking &quot;Accept &amp; Start Exam&quot;, you confirm that you have read and agree to these terms.
            </p>

            <div className="exam-student-camera-box">
              <div className="exam-student-camera-title">
                <FaCamera aria-hidden="true" /> Camera verification required
              </div>
              <video
                ref={previewRef}
                autoPlay
                playsInline
                muted
                className="exam-student-camera-preview"
              />
              <div
                className={
                  cameraOk ? 'exam-student-camera-status exam-student-camera-status--ok' : 'exam-student-camera-status exam-student-camera-status--err'
                }
              >
                {cameraOk ? 'Camera verified — you can start the exam.' : cameraError || 'Requesting camera access…'}
              </div>
              {!cameraOk && cameraError ? (
                <button type="button" className="exam-student-btn exam-student-btn-outline exam-student-btn-retry" onClick={() => void startCameraCheck()}>
                  Try again
                </button>
              ) : null}
            </div>

            <button
              type="button"
              onClick={() => void acceptAndStart()}
              disabled={!canStartExam}
              className={`exam-student-btn exam-student-btn-full exam-student-btn-accept ${canStartExam ? 'exam-student-btn-green' : 'exam-student-btn-disabled'}`}
            >
              <FaCheck aria-hidden="true" className="exam-student-btn-accept-icon" />
              Accept &amp; Start Exam
            </button>
          </div>
        </div>
      ) : null}

      {exam && !feedbackOpen ? (
        <div className="exam-student-card exam-student-padding-lg">
          <div className="exam-student-header">
            <div className="exam-student-exam-title">{exam.exam_title}</div>
            <div className="exam-student-timer">Time Left: {formatMMSS(timeLeft)}</div>
          </div>

          {q ? (
            <div className="exam-student-question-wrap">
              <div className="exam-student-question-title">
                Q{idx + 1}: {q.question_text}
              </div>

              <div className="exam-student-options">
                {[1, 2, 3, 4].map((n) => (
                  <label key={n} className="exam-student-option">
                    <input
                      type="radio"
                      name="answer"
                      checked={(answers[q.id] ?? 0) === n}
                      onChange={() => setAnswers((p) => ({ ...p, [q.id]: n }))}
                    />
                    <span className="exam-student-option-text">{q[`option_${n}`]}</span>
                  </label>
                ))}
              </div>

              <div className="exam-student-nav">
                <button
                  type="button"
                  disabled={idx === 0 || submitting}
                  onClick={() => setIdx((x) => x - 1)}
                  className="exam-student-btn exam-student-btn-outline"
                >
                  Previous
                </button>
                {isLast ? (
                  <button type="button" disabled={submitting} onClick={() => void submitExam(false)} className="exam-student-btn exam-student-btn-green">
                    {submitting ? 'Submitting...' : 'Submit Exam'}
                  </button>
                ) : (
                  <button type="button" disabled={submitting} onClick={() => setIdx((x) => x + 1)} className="exam-student-btn exam-student-btn-outline">
                    Next
                  </button>
                )}
              </div>
            </div>
          ) : null}

          <video ref={examCameraRef} autoPlay muted playsInline className="exam-student-hidden-video" />
        </div>
      ) : null}

      {feedbackOpen ? (
        <div className="exam-student-card exam-student-padding-lg">
          <h3 className="exam-student-card-title">Exam Feedback</h3>
          {[
            ['q1_experience', '1. How was your overall experience with the exam portal?', ['Poor', 'Good', 'Better', 'Best']],
            ['q2_ui', '2. How would you rate the user interface (UI) and ease of use?', ['Poor', 'Good', 'Better', 'Best']],
            ['q3_technical', '3. Did you experience any technical glitches or slowness during the exam?', ['No Glitches', 'Minor Issues', 'Major Issues', 'Unusable']],
            ['q4_proctoring', '4. How was the proctoring experience (webcam monitoring)?', ['Comfortable', 'Neutral', 'Uncomfortable', 'Did not notice']]
          ].map(([key, label, options]) => (
            <div key={key} className="exam-student-feedback-item">
              <div className="exam-student-feedback-title">{label}</div>
              <div className="exam-student-feedback-options">
                {options.map((opt) => (
                  <label key={opt} className="exam-student-feedback-option">
                    <input type="radio" name={key} value={opt} checked={feedback[key] === opt} onChange={() => setFeedback((p) => ({ ...p, [key]: opt }))} />
                    <span>{opt}</span>
                  </label>
                ))}
              </div>
            </div>
          ))}

          <button type="button" onClick={() => void submitFeedback()} className="exam-student-btn exam-student-btn-blue exam-student-btn-full exam-student-top">
            Submit Feedback
          </button>
        </div>
      ) : null}
    </div>
  );
}
