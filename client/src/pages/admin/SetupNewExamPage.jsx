import React, { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { FaFileArrowUp, FaPenToSquare } from 'react-icons/fa6';
import { api } from '../../api/client.js';
import { adminRoute } from '../../constants/adminRoutes.js';
import './SetupNewExamPage.css';

const emptyQuestion = () => ({
  question_text: '',
  option_1: '',
  option_2: '',
  option_3: '',
  option_4: '',
  correct_answer: 1,
  marks: 1
});

export function SetupNewExamPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const initialTab = searchParams.get('tab');
  const [mode, setMode] = useState(() =>
    initialTab === 'upload' ? 'upload' : 'manual'
  );
  const [msg, setMsg] = useState('');
  const [loading, setLoading] = useState(false);

  const [exam, setExam] = useState({
    exam_title: '',
    exam_code: '',
    exam_date: '',
    duration: 60,
    max_marks: ''
  });
  const [questions, setQuestions] = useState([emptyQuestion()]);

  const [uploadExam, setUploadExam] = useState({
    exam_title: '',
    exam_code: '',
    exam_date: '',
    duration: 60,
    max_marks: '',
    questions_to_show: '',
    domain: ''
  });
  const [file, setFile] = useState(null);

  function addQuestion() {
    setQuestions((q) => [...q, emptyQuestion()]);
  }

  function updateQuestion(i, field, value) {
    setQuestions((rows) => {
      const next = [...rows];
      next[i] = { ...next[i], [field]: value };
      return next;
    });
  }

  async function saveManual(e) {
    e.preventDefault();
    setMsg('');
    const filled = questions.filter(
      (q) =>
        q.question_text.trim() &&
        q.option_1.trim() &&
        q.option_2.trim() &&
        q.option_3.trim() &&
        q.option_4.trim()
    );
    if (!exam.exam_title.trim() || !exam.exam_code.trim() || !exam.exam_date) {
      setMsg('Please fill all exam detail fields.');
      return;
    }
    if (!filled.length) {
      setMsg('Add at least one complete question.');
      return;
    }
    setLoading(true);
    try {
      const payload = {
        exam_code: exam.exam_code.trim(),
        exam_title: exam.exam_title.trim(),
        exam_date: exam.exam_date,
        duration: Number(exam.duration),
        max_marks: exam.max_marks === '' ? null : Number(exam.max_marks),
        domain: '',
        questions: filled.map((q) => ({
          question_text: q.question_text.trim(),
          option_1: q.option_1.trim(),
          option_2: q.option_2.trim(),
          option_3: q.option_3.trim(),
          option_4: q.option_4.trim(),
          correct_answer: Number(q.correct_answer),
          marks: Number(q.marks) || 1
        }))
      };
      const res = await api.post('/exams', payload);
      if (res.data?.success) {
        setMsg('Exam saved successfully.');
        navigate(adminRoute('questions/manage'));
      } else {
        setMsg(res.data?.message || 'Save failed.');
      }
    } catch (err) {
      setMsg(err?.response?.data?.message || err?.message || 'Save failed.');
    } finally {
      setLoading(false);
    }
  }

  async function uploadExcel(e) {
    e.preventDefault();
    setMsg('');
    if (!file) {
      setMsg('Please choose an Excel file.');
      return;
    }
    if (!uploadExam.exam_title.trim() || !uploadExam.exam_code.trim() || !uploadExam.exam_date) {
      setMsg('Please fill exam title, code, and date.');
      return;
    }
    setLoading(true);
    try {
      const fd = new FormData();
      fd.append('excel_file', file);
      fd.append('exam_code', uploadExam.exam_code.trim());
      fd.append('exam_title', uploadExam.exam_title.trim());
      fd.append('exam_date', uploadExam.exam_date);
      fd.append('duration', String(uploadExam.duration));
      fd.append('max_marks', uploadExam.max_marks === '' ? '' : String(uploadExam.max_marks));
      fd.append('domain', uploadExam.domain || '');
      if (uploadExam.questions_to_show.trim()) {
        fd.append('questions_to_show', uploadExam.questions_to_show.trim());
      }
      const res = await api.post('/questions/upload-excel', fd, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      if (res.data?.success) {
        setMsg(`Uploaded ${res.data.inserted || ''} questions.`);
        navigate(adminRoute('questions/manage'));
      } else {
        setMsg(res.data?.message || 'Upload failed.');
      }
    } catch (err) {
      setMsg(err?.response?.data?.message || err?.message || 'Upload failed.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="setup-exam-page">
      <div className="setup-exam-head">
        <h1 className="setup-exam-title">Setup New Exam</h1>
        <button type="button" className="setup-exam-back" onClick={() => navigate(adminRoute('questions'))}>
          Back to Exams
        </button>
      </div>

      <div className="setup-exam-tabs" role="tablist">
        <button
          type="button"
          role="tab"
          aria-selected={mode === 'manual'}
          className={`setup-exam-tab ${mode === 'manual' ? 'setup-exam-tab-active' : ''}`}
          onClick={() => setMode('manual')}
        >
          <FaPenToSquare className="setup-exam-tab-icon" aria-hidden="true" />
          Manual
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={mode === 'upload'}
          className={`setup-exam-tab ${mode === 'upload' ? 'setup-exam-tab-active' : ''}`}
          onClick={() => setMode('upload')}
        >
          <FaFileArrowUp className="setup-exam-tab-icon" aria-hidden="true" />
          Upload Excel File
        </button>
      </div>

      {msg ? (
        <div className="setup-exam-msg" role="status">
          {msg}
        </div>
      ) : null}

      {mode === 'manual' ? (
        <form className="setup-exam-card" onSubmit={saveManual}>
          <h2 className="setup-exam-card-title">Exam details</h2>
          <div className="setup-exam-grid">
            <div className="setup-exam-field">
              <label>Exam Title</label>
              <input
                value={exam.exam_title}
                onChange={(e) => setExam((p) => ({ ...p, exam_title: e.target.value }))}
                placeholder="e.g. Physics Test 1"
                className="setup-exam-input"
              />
            </div>
            <div className="setup-exam-field">
              <label>Exam Code</label>
              <input
                value={exam.exam_code}
                onChange={(e) => setExam((p) => ({ ...p, exam_code: e.target.value }))}
                placeholder="e.g. PHY101-MID"
                className="setup-exam-input"
              />
              <span className="setup-exam-hint">* Unique code for identifying the exam</span>
            </div>
            <div className="setup-exam-field">
              <label>Exam Date</label>
              <input
                type="date"
                value={exam.exam_date}
                onChange={(e) => setExam((p) => ({ ...p, exam_date: e.target.value }))}
                className="setup-exam-input"
              />
              <span className="setup-exam-hint">* Students can take the exam anytime on this day</span>
            </div>
            <div className="setup-exam-field">
              <label>Duration (minutes)</label>
              <input
                type="number"
                min={1}
                max={600}
                value={exam.duration}
                onChange={(e) => setExam((p) => ({ ...p, duration: e.target.value }))}
                placeholder="e.g. 60"
                className="setup-exam-input"
              />
            </div>
          </div>
          <div className="setup-exam-field setup-exam-field-full">
            <label>Max Marks</label>
            <input
              value={exam.max_marks}
              onChange={(e) => setExam((p) => ({ ...p, max_marks: e.target.value }))}
              placeholder="e.g. 100"
              className="setup-exam-input"
            />
          </div>

          <div className="setup-exam-divider" />

          <h2 className="setup-exam-card-title">Questions</h2>
          {questions.map((q, i) => (
            <div key={i} className="setup-exam-q-block">
              <div className="setup-exam-q-label">Question {i + 1}</div>
              <textarea
                value={q.question_text}
                onChange={(e) => updateQuestion(i, 'question_text', e.target.value)}
                placeholder="Question text"
                className="setup-exam-textarea"
                rows={2}
              />
              <div className="setup-exam-grid setup-exam-grid-tight">
                {[1, 2, 3, 4].map((n) => (
                  <input
                    key={n}
                    value={q[`option_${n}`]}
                    onChange={(e) => updateQuestion(i, `option_${n}`, e.target.value)}
                    placeholder={`Option ${n}`}
                    className="setup-exam-input"
                  />
                ))}
              </div>
              <div className="setup-exam-row">
                <div className="setup-exam-field">
                  <label>Correct answer</label>
                  <select
                    value={q.correct_answer}
                    onChange={(e) => updateQuestion(i, 'correct_answer', Number(e.target.value))}
                    className="setup-exam-input"
                  >
                    <option value={1}>1</option>
                    <option value={2}>2</option>
                    <option value={3}>3</option>
                    <option value={4}>4</option>
                  </select>
                </div>
                <div className="setup-exam-field">
                  <label>Marks</label>
                  <input
                    type="number"
                    min={0}
                    max={100}
                    value={q.marks}
                    onChange={(e) => updateQuestion(i, 'marks', e.target.value)}
                    className="setup-exam-input"
                  />
                </div>
              </div>
            </div>
          ))}

          <button type="button" className="setup-exam-add-q" onClick={addQuestion}>
            + Add Question Manually
          </button>

          <div className="setup-exam-actions">
            <button type="submit" className="setup-exam-save" disabled={loading}>
              {loading ? 'Saving…' : 'Save Exam'}
            </button>
          </div>
        </form>
      ) : (
        <form className="setup-exam-card" onSubmit={uploadExcel}>
          <h2 className="setup-exam-card-title">Exam Details &amp; File Upload</h2>
          <div className="setup-exam-grid">
            <div className="setup-exam-field">
              <label>Exam Title</label>
              <input
                value={uploadExam.exam_title}
                onChange={(e) => setUploadExam((p) => ({ ...p, exam_title: e.target.value }))}
                placeholder="e.g. Physics Test 1"
                className="setup-exam-input"
              />
            </div>
            <div className="setup-exam-field">
              <label>Exam Code</label>
              <input
                value={uploadExam.exam_code}
                onChange={(e) => setUploadExam((p) => ({ ...p, exam_code: e.target.value }))}
                placeholder="Enter unique exam code"
                className="setup-exam-input"
              />
              <span className="setup-exam-hint">* This must match an existing exam or will create a new one.</span>
            </div>
            <div className="setup-exam-field">
              <label>Exam Date</label>
              <input
                type="date"
                value={uploadExam.exam_date}
                onChange={(e) => setUploadExam((p) => ({ ...p, exam_date: e.target.value }))}
                className="setup-exam-input"
              />
            </div>
            <div className="setup-exam-field">
              <label>Duration (minutes)</label>
              <input
                type="number"
                min={1}
                max={600}
                value={uploadExam.duration}
                onChange={(e) => setUploadExam((p) => ({ ...p, duration: e.target.value }))}
                placeholder="e.g. 60"
                className="setup-exam-input"
              />
            </div>
          </div>
          <div className="setup-exam-field setup-exam-field-full">
            <label>Total Marks from this file</label>
            <input
              value={uploadExam.max_marks}
              onChange={(e) => setUploadExam((p) => ({ ...p, max_marks: e.target.value }))}
              placeholder="e.g. 100"
              className="setup-exam-input"
            />
          </div>
          <div className="setup-exam-field setup-exam-field-full">
            <label>Questions to Show (Optional)</label>
            <input
              value={uploadExam.questions_to_show}
              onChange={(e) => setUploadExam((p) => ({ ...p, questions_to_show: e.target.value }))}
              placeholder="Leave empty to show all questions"
              className="setup-exam-input"
            />
            <span className="setup-exam-hint">
              If you have 200 questions but want only 20 random questions for students, enter 20 here.
            </span>
          </div>
          <div className="setup-exam-field setup-exam-field-full">
            <label>Select Excel File (.xlsx)</label>
            <input
              type="file"
              accept=".xlsx,.xls"
              onChange={(e) => setFile(e.target.files?.[0] || null)}
              className="setup-exam-file"
            />
            <span className="setup-exam-hint setup-exam-hint-block">
              Use columns: question_text, option_1, option_2, option_3, option_4, correct_answer (1–4), marks (optional).
            </span>
          </div>
          <div className="setup-exam-actions">
            <button type="submit" className="setup-exam-save" disabled={loading}>
              {loading ? 'Uploading…' : 'Upload Questions'}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
