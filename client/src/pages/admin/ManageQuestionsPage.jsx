import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { FaEye, FaPlus, FaTrash } from 'react-icons/fa6';
import { api } from '../../api/client.js';
import { adminRoute } from '../../constants/adminRoutes.js';
import './ManageQuestionsPage.css';

function formatDate(d) {
  if (!d) return '—';
  try {
    const x = new Date(d);
    if (Number.isNaN(x.getTime())) return '—';
    return x.toISOString().slice(0, 10);
  } catch {
    return '—';
  }
}

function shortenId(id) {
  if (!id) return '—';
  const s = String(id);
  return s.length > 8 ? `${s.slice(0, 8)}…` : s;
}

function examDateToIso(examDate) {
  if (!examDate) return '';
  const x = new Date(examDate);
  if (Number.isNaN(x.getTime())) return String(examDate);
  return x.toISOString();
}

export function ManageQuestionsPage() {
  const navigate = useNavigate();
  const [exams, setExams] = useState([]);
  const [loadingExams, setLoadingExams] = useState(true);
  const [msg, setMsg] = useState('');
  const [msgTone, setMsgTone] = useState('success');

  const [filterCode, setFilterCode] = useState('');
  const [listQuestions, setListQuestions] = useState([]);
  const [loadingQuestions, setLoadingQuestions] = useState(false);

  const [deleteExamCode, setDeleteExamCode] = useState('');

  const [addTargetExamCode, setAddTargetExamCode] = useState('');
  const [addQ, setAddQ] = useState({
    question_text: '',
    option_1: '',
    option_2: '',
    option_3: '',
    option_4: '',
    correct_answer: 1,
    marks: 1
  });
  const [addLoading, setAddLoading] = useState(false);

  const loadExams = useCallback(async () => {
    setLoadingExams(true);
    try {
      const res = await api.get('/questions/exams-overview');
      setExams(res.data?.exams || []);
    } catch {
      setExams([]);
      setMsgTone('error');
      setMsg('Could not load exams.');
    } finally {
      setLoadingExams(false);
    }
  }, []);

  useEffect(() => {
    void loadExams();
  }, [loadExams]);

  async function loadQuestionsForExam(code) {
    const c = String(code || '').trim();
    setMsg('');
    if (!c) {
      setMsgTone('error');
      setMsg('Enter an exam code.');
      return;
    }
    setLoadingQuestions(true);
    try {
      const res = await api.get(`/questions?exam_code=${encodeURIComponent(c)}`);
      setListQuestions(res.data?.questions || []);
    } catch {
      setListQuestions([]);
      setMsgTone('error');
      setMsg('Could not load questions.');
    } finally {
      setLoadingQuestions(false);
    }
  }

  function onLoadQuestionsClick() {
    void loadQuestionsForExam(filterCode);
  }

  function onViewExam(row) {
    setFilterCode(row.exam_code);
    setMsg('');
    void loadQuestionsForExam(row.exam_code);
  }

  function onAddQuestionClick(row) {
    setAddTargetExamCode(row.exam_code);
    setMsg('');
  }

  function cancelOverviewAdd() {
    setAddTargetExamCode('');
  }

  async function submitOverviewAddQuestion(e) {
    e.preventDefault();
    setMsg('');
    const meta = exams.find((x) => x.exam_code === addTargetExamCode);
    if (!meta) {
      setMsgTone('error');
      setMsg('Exam not found. Refresh the list.');
      setAddTargetExamCode('');
      return;
    }
    if (
      !addQ.question_text.trim() ||
      !addQ.option_1.trim() ||
      !addQ.option_2.trim() ||
      !addQ.option_3.trim() ||
      !addQ.option_4.trim()
    ) {
      setMsgTone('error');
      setMsg('Enter the question and all four options.');
      return;
    }
    setAddLoading(true);
    try {
      await api.post('/questions', {
        exam_code: meta.exam_code,
        exam_title: meta.exam_title,
        exam_date: examDateToIso(meta.exam_date),
        duration: Number(meta.duration) || 60,
        question_text: addQ.question_text.trim(),
        option_1: addQ.option_1.trim(),
        option_2: addQ.option_2.trim(),
        option_3: addQ.option_3.trim(),
        option_4: addQ.option_4.trim(),
        correct_answer: Number(addQ.correct_answer),
        marks: addQ.marks === '' ? 1 : Number(addQ.marks)
      });
      setMsgTone('success');
      setMsg(`Question saved to database for exam "${meta.exam_code}".`);
      setAddQ({
        question_text: '',
        option_1: '',
        option_2: '',
        option_3: '',
        option_4: '',
        correct_answer: 1,
        marks: 1
      });
      await loadExams();
      if (filterCode.trim() === meta.exam_code) {
        await loadQuestionsForExam(meta.exam_code);
      }
    } catch (err) {
      setMsgTone('error');
      setMsg(err?.response?.data?.message || err?.message || 'Could not save question.');
    } finally {
      setAddLoading(false);
    }
  }

  async function removeExam(row) {
    if (!window.confirm(`Delete all questions for exam "${row.exam_code}"?`)) return;
    try {
      await api.delete('/questions/bulk/by-exam-code', { data: { exam_code: row.exam_code } });
      setMsgTone('success');
      setMsg(`Deleted questions for ${row.exam_code}.`);
      if (filterCode.trim() === row.exam_code) setListQuestions([]);
      if (addTargetExamCode === row.exam_code) setAddTargetExamCode('');
      await loadExams();
    } catch (err) {
      setMsgTone('error');
      setMsg(err?.response?.data?.message || 'Delete failed.');
    }
  }

  async function deleteQuestionsByCodeSection() {
    const c = deleteExamCode.trim();
    if (!c) {
      setMsgTone('error');
      setMsg('Enter an exam code to delete.');
      return;
    }
    if (!window.confirm(`Permanently delete ALL questions for exam "${c}"?`)) return;
    try {
      await api.delete('/questions/bulk/by-exam-code', { data: { exam_code: c } });
      setMsgTone('success');
      setMsg(`Deleted all questions for ${c}.`);
      setDeleteExamCode('');
      if (filterCode.trim() === c) setListQuestions([]);
      if (addTargetExamCode === c) setAddTargetExamCode('');
      await loadExams();
    } catch (err) {
      setMsgTone('error');
      setMsg(err?.response?.data?.message || 'Delete failed.');
    }
  }

  async function deleteSingleQuestion(q) {
    if (!window.confirm('Delete this question?')) return;
    try {
      await api.delete(`/questions/${q._id}`);
      setMsgTone('success');
      setMsg('Question deleted.');
      await loadQuestionsForExam(filterCode.trim() || q.exam_code);
      await loadExams();
    } catch (err) {
      setMsgTone('error');
      setMsg(err?.response?.data?.message || 'Delete failed.');
    }
  }

  async function deleteAllExamsAndQuestions() {
    if (
      !window.confirm(
        'This will permanently delete ALL questions (every exam in the bank). This cannot be undone. Continue?'
      )
    ) {
      return;
    }
    if (!window.confirm('Final confirmation: delete everything?')) return;
    try {
      const res = await api.delete('/questions/bulk/all');
      setMsgTone('success');
      setMsg(res.data?.message || 'All questions deleted.');
      setListQuestions([]);
      setFilterCode('');
      setAddTargetExamCode('');
      await loadExams();
    } catch (err) {
      setMsgTone('error');
      setMsg(err?.response?.data?.message || 'Delete failed.');
    }
  }

  const showQuestionsEmpty = !loadingQuestions && listQuestions.length === 0;

  const addMeta =
    addTargetExamCode && exams.length
      ? exams.find((e) => e.exam_code === addTargetExamCode)
      : null;

  return (
    <div className="manage-q-page">
      <div className="manage-q-head">
        <h1 className="manage-q-title">Manage Questions</h1>
        <button type="button" className="manage-q-back-dash" onClick={() => navigate(adminRoute())}>
          Back to Dashboard
        </button>
      </div>

      {msg ? (
        <div
          className={`manage-q-msg${msgTone === 'error' ? ' manage-q-msg-error' : ''}`}
          role="status"
        >
          {msg}
        </div>
      ) : null}

      <section className="manage-q-card manage-q-card-gap">
        <h2 className="manage-q-section-title">Exams Overview</h2>
        {loadingExams ? (
          <div className="manage-q-loading">Loading…</div>
        ) : (
          <div className="manage-q-table-wrap">
            <table className="manage-q-table">
              <thead>
                <tr>
                  <th>Exam Code</th>
                  <th>Exam Title</th>
                  <th>Date</th>
                  <th>Duration</th>
                  <th className="manage-q-th-actions">Actions</th>
                </tr>
              </thead>
              <tbody>
                {exams.map((row, i) => (
                  <tr key={`${row.exam_code}-${i}`} className={i % 2 ? 'manage-q-row-alt' : ''}>
                    <td className="manage-q-mono">{row.exam_code}</td>
                    <td>{row.exam_title}</td>
                    <td>{formatDate(row.exam_date)}</td>
                    <td>{row.duration != null ? `${row.duration} mins` : '—'}</td>
                    <td className="manage-q-td-actions">
                      <div className="manage-q-actions">
                        <button
                          type="button"
                          className="manage-q-btn manage-q-btn-view"
                          onClick={() => onViewExam(row)}
                        >
                          <FaEye aria-hidden="true" />
                          View
                        </button>
                        <button
                          type="button"
                          className="manage-q-btn manage-q-btn-add-q"
                          onClick={() => onAddQuestionClick(row)}
                        >
                          <FaPlus aria-hidden="true" />
                          Add Question
                        </button>
                        <button
                          type="button"
                          className="manage-q-btn manage-q-btn-del"
                          onClick={() => void removeExam(row)}
                        >
                          <FaTrash aria-hidden="true" />
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {!exams.length ? <div className="manage-q-empty">No exams found.</div> : null}
          </div>
        )}

        {addMeta ? (
          <div className="manage-q-overview-add">
            <div className="manage-q-overview-add-head">
              <h3 className="manage-q-overview-add-title">
                Add question — <span className="manage-q-mono">{addMeta.exam_code}</span>
                <span className="manage-q-overview-add-sub">{addMeta.exam_title}</span>
              </h3>
              <button type="button" className="manage-q-overview-add-cancel" onClick={cancelOverviewAdd}>
                Close
              </button>
            </div>
            <p className="manage-q-overview-add-hint">
              This question is stored in the database for the exam shown above.
            </p>
            <form className="manage-q-overview-add-form" onSubmit={(e) => void submitOverviewAddQuestion(e)}>
              <div className="manage-q-overview-add-field">
                <label htmlFor="ov-q-text">Question</label>
                <textarea
                  id="ov-q-text"
                  className="manage-q-overview-textarea"
                  rows={3}
                  value={addQ.question_text}
                  onChange={(e) => setAddQ((p) => ({ ...p, question_text: e.target.value }))}
                  required
                />
              </div>
              <div className="manage-q-overview-add-grid">
                {[1, 2, 3, 4].map((n) => (
                  <div key={n} className="manage-q-overview-add-field">
                    <label htmlFor={`ov-opt-${n}`}>Option {n}</label>
                    <input
                      id={`ov-opt-${n}`}
                      className="manage-q-filter-input manage-q-overview-input-full"
                      value={addQ[`option_${n}`]}
                      onChange={(e) => setAddQ((p) => ({ ...p, [`option_${n}`]: e.target.value }))}
                      required
                    />
                  </div>
                ))}
              </div>
              <div className="manage-q-overview-add-row">
                <div className="manage-q-overview-add-field">
                  <label htmlFor="ov-correct">Correct</label>
                  <select
                    id="ov-correct"
                    className="manage-q-filter-input"
                    value={addQ.correct_answer}
                    onChange={(e) => setAddQ((p) => ({ ...p, correct_answer: Number(e.target.value) }))}
                  >
                    <option value={1}>1</option>
                    <option value={2}>2</option>
                    <option value={3}>3</option>
                    <option value={4}>4</option>
                  </select>
                </div>
                <div className="manage-q-overview-add-field">
                  <label htmlFor="ov-marks">Marks</label>
                  <input
                    id="ov-marks"
                    type="number"
                    min={0}
                    max={100}
                    className="manage-q-filter-input"
                    value={addQ.marks}
                    onChange={(e) => setAddQ((p) => ({ ...p, marks: e.target.value }))}
                  />
                </div>
              </div>
              <div className="manage-q-overview-add-actions">
                <button type="submit" className="manage-q-load-btn" disabled={addLoading}>
                  {addLoading ? 'Saving…' : 'Save to database'}
                </button>
              </div>
            </form>
          </div>
        ) : null}
      </section>

      <section className="manage-q-card manage-q-card-gap">
        <div className="manage-q-filter-row">
          <input
            type="text"
            className="manage-q-filter-input"
            placeholder="Enter Exam Code to filter questions..."
            value={filterCode}
            onChange={(e) => setFilterCode(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && onLoadQuestionsClick()}
          />
          <button type="button" className="manage-q-load-btn" onClick={onLoadQuestionsClick}>
            Load Questions
          </button>
        </div>
      </section>

      <section className="manage-q-card manage-q-card-gap">
        <h2 className="manage-q-section-title">Questions List</h2>
        <div className="manage-q-table-wrap manage-q-table-wide">
          <table className="manage-q-table manage-q-table-questions">
            <thead>
              <tr>
                <th>ID</th>
                <th>Exam Code</th>
                <th>Question</th>
                <th>Option 1</th>
                <th>Option 2</th>
                <th>Option 3</th>
                <th>Option 4</th>
                <th>Correct</th>
                <th>Marks</th>
                <th className="manage-q-th-actions">Actions</th>
              </tr>
            </thead>
            <tbody>
              {listQuestions.map((q, i) => (
                <tr key={q._id || i} className={i % 2 ? 'manage-q-row-alt' : ''}>
                  <td className="manage-q-mono manage-q-cell-id" title={q._id}>
                    {shortenId(q._id)}
                  </td>
                  <td className="manage-q-mono">{q.exam_code}</td>
                  <td className="manage-q-cell-q">{q.question_text}</td>
                  <td className="manage-q-cell-opt">{q.option_1}</td>
                  <td className="manage-q-cell-opt">{q.option_2}</td>
                  <td className="manage-q-cell-opt">{q.option_3}</td>
                  <td className="manage-q-cell-opt">{q.option_4}</td>
                  <td>{q.correct_answer}</td>
                  <td>{q.marks}</td>
                  <td className="manage-q-td-actions">
                    <button
                      type="button"
                      className="manage-q-btn manage-q-btn-del"
                      onClick={() => void deleteSingleQuestion(q)}
                    >
                      <FaTrash aria-hidden="true" />
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {loadingQuestions ? (
            <div className="manage-q-loading">Loading…</div>
          ) : null}
          {showQuestionsEmpty ? (
            <div className="manage-q-empty manage-q-empty-inline">
              No questions found. Select an exam or use the filter.
            </div>
          ) : null}
        </div>
      </section>

      <section className="manage-q-card manage-q-card-gap">
        <h2 className="manage-q-section-title">Delete Questions for an Exam</h2>
        <div className="manage-q-filter-row">
          <input
            type="text"
            className="manage-q-filter-input"
            placeholder="Enter Exam Code to delete..."
            value={deleteExamCode}
            onChange={(e) => setDeleteExamCode(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && void deleteQuestionsByCodeSection()}
          />
          <button
            type="button"
            className="manage-q-btn manage-q-btn-del manage-q-btn-wide"
            onClick={() => void deleteQuestionsByCodeSection()}
          >
            <FaTrash aria-hidden="true" />
            Delete Questions
          </button>
        </div>
      </section>

      <section className="manage-q-card manage-q-card-gap manage-q-card-danger-zone">
        <h2 className="manage-q-danger-title">Danger Zone</h2>
        <p className="manage-q-danger-text">
          This will permanently delete ALL exams and ALL questions from the database.
        </p>
        <button
          type="button"
          className="manage-q-btn manage-q-btn-del manage-q-btn-danger-all"
          onClick={() => void deleteAllExamsAndQuestions()}
        >
          <FaTrash aria-hidden="true" />
          Delete All Exams &amp; Questions
        </button>
      </section>
    </div>
  );
}
