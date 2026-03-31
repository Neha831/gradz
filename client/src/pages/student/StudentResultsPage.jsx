import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { api } from '../../api/client.js';
import { studentRoute } from '../../constants/studentRoutes.js';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { FaArrowLeft, FaDownload, FaEye } from 'react-icons/fa6';
import { useAuth } from '../../auth/useAuth.js';
import { generateStudentResultPdf } from '../../utils/studentResultPdf.js';
import './StudentResultsPage.css';

function rowForPdf(e, user) {
  return {
    exam_title: e.exam_title,
    exam_code: e.exam_code,
    max_marks: e.max_marks,
    obtained_marks: e.obtained_marks,
    email_id: user?.email || '',
    student_name: user?.full_name || ''
  };
}

export function StudentResultsPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const selectedExamCode = searchParams.get('exam_code') || '';

  const [analysis, setAnalysis] = useState(null);
  const [loading, setLoading] = useState(false);
  const [exams, setExams] = useState([]);
  const [detail, setDetail] = useState(null);
  const [pdfBusy, setPdfBusy] = useState(false);

  const percent = useMemo(() => {
    if (!analysis) return null;
    return `Accuracy: ${analysis.overall_accuracy}%`;
  }, [analysis]);

  const load = useCallback(async () => {
    setLoading(true);
    if (selectedExamCode) {
      setDetail(null);
    }
    try {
      const [a, list] = await Promise.all([
        api.get('/results/student/analysis'),
        api.get('/results/student/exams')
      ]);
      setAnalysis(a.data);
      setExams(list.data?.exams || []);

      if (selectedExamCode) {
        try {
          const d = await api.get(`/results/student/exams/${encodeURIComponent(selectedExamCode)}`);
          setDetail(d.data?.result || null);
        } catch {
          setDetail(null);
        }
      } else {
        setDetail(null);
      }
    } catch {
      setAnalysis(null);
      setExams([]);
      setDetail(null);
    } finally {
      setLoading(false);
    }
  }, [selectedExamCode]);

  useEffect(() => {
    void load();
  }, [load]);

  async function onPdf(row, action) {
    if (pdfBusy) return;
    setPdfBusy(true);
    try {
      await generateStudentResultPdf(rowForPdf(row, user), action);
    } catch {
      // eslint-disable-next-line no-alert
      window.alert('Could not generate PDF. Please try again.');
    } finally {
      setPdfBusy(false);
    }
  }

  return (
    <div className="student-results-mern">
      <a
        href={studentRoute()}
        className="student-results-back-fab"
        onClick={(e) => {
          e.preventDefault();
          navigate(studentRoute());
        }}
        title="Back to Dashboard"
        aria-label="Back to Dashboard"
      >
        <FaArrowLeft aria-hidden="true" />
      </a>

      <div className="student-results-main">
        <header className="student-results-topbar">
          <div className="student-results-topbar-left">
            <h1 className="student-results-h1">My Exam Results</h1>
            <p className="student-results-topbar-desc">
              Review your scores and download or view your result cards.
            </p>
          </div>
          <button
            type="button"
            className="student-results-analysis-btn"
            onClick={() => navigate(studentRoute('result-analysis'))}
          >
            Open Result Analysis
          </button>
        </header>

        <main className="student-results-dashboard" aria-busy={pdfBusy}>
          {loading ? <div className="student-results-loading">Loading...</div> : null}

          {!loading && selectedExamCode && !detail ? (
            <div className="student-results-missing-detail" role="alert">
              <p className="student-results-missing-detail-text">
                We couldn&apos;t load that exam result. It may not be shared with you, or the link may be
                incorrect.
              </p>
              <button
                type="button"
                className="student-results-missing-detail-btn"
                onClick={() => navigate(studentRoute('results'))}
              >
                View all results
              </button>
            </div>
          ) : null}

          {!loading && analysis ? (
            <div className="student-results-summary">
              <div className="student-results-summary-title">Performance summary</div>
              <div className="student-results-summary-row">
                <span>
                  Overall accuracy:{' '}
                  {analysis.overall_accuracy === 'N/A' ? 'N/A' : `${analysis.overall_accuracy}%`}
                </span>
                <span>
                  Average speed:{' '}
                  {analysis.average_speed === 'N/A' ? 'N/A' : `${analysis.average_speed} QPM`}
                </span>
              </div>
              {percent ? <div className="student-results-summary-muted">{percent}</div> : null}
            </div>
          ) : null}

          {!loading && selectedExamCode && detail ? (
            <div className="student-results-detail-card">
              <div className="student-results-detail-title">Selected exam</div>
              <p className="student-results-detail-line">
                <strong>{detail.exam_title}</strong> — {detail.exam_code}
              </p>
              <p className="student-results-detail-line">
                Obtained: <strong>{detail.obtained_marks}</strong> / {detail.max_marks}
              </p>
              <div className="student-results-detail-actions">
                <button
                  type="button"
                  className="student-results-action student-results-action--muted"
                  onClick={() => navigate(studentRoute('results'))}
                >
                  Back to table
                </button>
                <button
                  type="button"
                  className="student-results-action student-results-action--blue"
                  disabled={pdfBusy}
                  onClick={() => void onPdf(detail, 'view')}
                >
                  <FaEye aria-hidden="true" /> View PDF
                </button>
                <button
                  type="button"
                  className="student-results-action student-results-action--green"
                  disabled={pdfBusy}
                  onClick={() => void onPdf(detail, 'download')}
                >
                  <FaDownload aria-hidden="true" /> Download
                </button>
              </div>
            </div>
          ) : null}

          <div className="student-results-container">
            {!loading && exams.length > 0 ? (
              <div className="student-results-table-wrap">
                <table className="student-results-table">
                  <thead>
                    <tr>
                      <th>Exam Title</th>
                      <th>Exam Code</th>
                      <th>Max Marks</th>
                      <th>Obtained Marks</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {exams.map((e, i) => (
                      <tr key={`${e.exam_code}-${i}`}>
                        <td data-label="Exam Title" className="student-results-td-title">
                          {e.exam_title}
                        </td>
                        <td data-label="Exam Code">{e.exam_code}</td>
                        <td data-label="Max Marks">{e.max_marks}</td>
                        <td data-label="Obtained Marks" className="student-results-td-score">
                          {e.obtained_marks}
                        </td>
                        <td data-label="Actions" className="student-results-action-cell">
                          <button
                            type="button"
                            className="student-results-icon-btn student-results-icon-btn--view"
                            title="View result PDF"
                            disabled={pdfBusy}
                            onClick={() => void onPdf(e, 'view')}
                          >
                            <FaEye aria-hidden="true" />
                          </button>
                          <button
                            type="button"
                            className="student-results-icon-btn student-results-icon-btn--dl"
                            title="Download PDF"
                            disabled={pdfBusy}
                            onClick={() => void onPdf(e, 'download')}
                          >
                            <FaDownload aria-hidden="true" />
                          </button>
                          <button
                            type="button"
                            className="student-results-link-detail"
                            onClick={() =>
                              navigate(
                                `${studentRoute('results')}?exam_code=${encodeURIComponent(e.exam_code)}`
                              )
                            }
                          >
                            Detail
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : null}

            {!loading && !exams.length ? (
              <p className="student-results-empty">No shared results available yet.</p>
            ) : null}
          </div>
        </main>
      </div>

      {pdfBusy ? (
        <div className="student-results-pdf-status" role="status" aria-live="polite">
          <span className="student-results-pdf-spinner" aria-hidden="true" />
          Generating PDF…
        </div>
      ) : null}
    </div>
  );
}
