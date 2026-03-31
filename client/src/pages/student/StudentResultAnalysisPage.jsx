import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArcElement,
  BarElement,
  CategoryScale,
  Chart as ChartJS,
  Legend,
  LinearScale,
  Title,
  Tooltip
} from 'chart.js';
import { Bar, Pie } from 'react-chartjs-2';
import { FaArrowLeft } from 'react-icons/fa6';
import { api } from '../../api/client.js';
import { studentRoute } from '../../constants/studentRoutes.js';
import './StudentResultAnalysisPage.css';

ChartJS.register(ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement, Title);

export function StudentResultAnalysisPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [avgSpeed, setAvgSpeed] = useState(null);
  const [overallAcc, setOverallAcc] = useState(null);
  const [examScores, setExamScores] = useState([]);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const { data } = await api.get('/results/student/analysis');
      if (!data?.success) {
        setError(data?.message || 'Could not load analysis.');
        setAvgSpeed('N/A');
        setOverallAcc('N/A');
        setExamScores([]);
        return;
      }
      if (data.average_speed === 'N/A' || data.overall_accuracy === 'N/A') {
        setAvgSpeed('N/A');
        setOverallAcc('N/A');
      } else {
        setAvgSpeed(Number(data.average_speed));
        setOverallAcc(Number(data.overall_accuracy));
      }
      setExamScores(Array.isArray(data.exam_scores) ? data.exam_scores : []);
    } catch (e) {
      const msg =
        e?.response?.data?.message ||
        (e?.code === 'ERR_NETWORK' || e?.message === 'Network Error'
          ? 'Cannot reach the server.'
          : e?.message) ||
        'Failed to load';
      setError(msg);
      setAvgSpeed('N/A');
      setOverallAcc('N/A');
      setExamScores([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const showPieChart = useMemo(() => {
    if (avgSpeed === 'N/A' || overallAcc === 'N/A') return false;
    const s = Number(avgSpeed);
    const a = Number(overallAcc);
    if (Number.isNaN(s) || Number.isNaN(a)) return false;
    return s > 0 || a > 0;
  }, [avgSpeed, overallAcc]);

  const pieData = useMemo(() => {
    if (!showPieChart || overallAcc === 'N/A' || overallAcc === null) return null;
    const acc = Math.max(0, Math.min(100, Number(overallAcc)));
    const rest = Math.max(0, 100 - acc);
    return {
      labels: ['Overall Accuracy', 'Incorrect / Remaining'],
      datasets: [
        {
          label: 'Overall Accuracy',
          data: [acc, rest],
          backgroundColor: ['#22c55e', '#ef4444'],
          borderColor: '#fff',
          borderWidth: 2
        }
      ]
    };
  }, [showPieChart, overallAcc]);

  const pieOptions = useMemo(
    () => ({
      responsive: true,
      maintainAspectRatio: false,
      aspectRatio: 1.15,
      onHover: (event, elements, chart) => {
        if (!chart?.canvas) return;
        chart.canvas.style.cursor = elements.length ? 'pointer' : 'default';
      },
      onClick: (_event, elements) => {
        if (!elements?.length) return;
        navigate(studentRoute('results'));
      },
      plugins: {
        legend: { position: 'top' },
        tooltip: {
          callbacks: {
            label(ctx) {
              const v = ctx.parsed;
              return `${ctx.label || ''}: ${typeof v === 'number' ? v.toFixed(2) : v}%`;
            }
          }
        }
      },
      layout: { padding: { top: 10, bottom: 10 } }
    }),
    [navigate]
  );

  const barData = useMemo(() => {
    if (!examScores.length) return null;
    const labels = examScores.map(
      (e) => `${e.exam_title || 'Exam'} (${new Date(e.submitted_at).toLocaleDateString()})`
    );
    return {
      labels,
      datasets: [
        {
          label: 'Accuracy (%)',
          data: examScores.map((e) => e.accuracy),
          backgroundColor: '#1E3A8A',
          borderColor: '#1E3A8A',
          borderWidth: 1
        }
      ]
    };
  }, [examScores]);

  const barOptions = useMemo(
    () => ({
      responsive: true,
      maintainAspectRatio: false,
      aspectRatio: 1.4,
      onHover: (event, elements, chart) => {
        if (!chart?.canvas) return;
        chart.canvas.style.cursor = elements.length ? 'pointer' : 'default';
      },
      onClick: (_event, elements) => {
        const first = elements?.[0];
        if (!first) return;
        const idx = first.index;
        const row = examScores[idx];
        if (!row?.exam_code) return;
        navigate(`${studentRoute('results')}?exam_code=${encodeURIComponent(row.exam_code)}`);
      },
      plugins: {
        legend: { position: 'top' },
        tooltip: {
          callbacks: {
            label(ctx) {
              const y = ctx.parsed?.y;
              return `${ctx.dataset?.label || ''}: ${typeof y === 'number' ? y.toFixed(2) : y}%`;
            }
          }
        }
      },
      scales: {
        x: {
          title: { display: true, text: 'Exams' },
          ticks: { maxRotation: 45, minRotation: 0, autoSkip: true }
        },
        y: {
          title: { display: true, text: 'Accuracy (%)' },
          min: 0,
          max: 100,
          ticks: { callback: (value) => `${value}%` }
        }
      }
    }),
    [examScores, navigate]
  );

  function formatSpeed() {
    if (loading) return null;
    if (avgSpeed === 'N/A' || avgSpeed === null) return 'N/A';
    const n = Number(avgSpeed);
    return Number.isNaN(n) ? 'N/A' : n.toFixed(2);
  }

  function formatAccuracy() {
    if (loading) return null;
    if (overallAcc === 'N/A' || overallAcc === null) return 'N/A';
    const n = Number(overallAcc);
    return Number.isNaN(n) ? 'N/A' : n.toFixed(2);
  }

  return (
    <div className="sra-page">
      <a
        href={studentRoute()}
        className="sra-back-fab"
        onClick={(e) => {
          e.preventDefault();
          navigate(studentRoute());
        }}
        title="Back to Dashboard"
        aria-label="Back to Dashboard"
      >
        <FaArrowLeft aria-hidden="true" />
      </a>

      <header className="sra-topbar">
        <h1 className="sra-title">Result Analysis</h1>
        <button
          type="button"
          className="sra-results-btn"
          onClick={() => navigate(studentRoute('results'))}
        >
          Open Results Table
        </button>
      </header>

      <main className="sra-main">
        <section className="sra-section">
          <h2 className="sra-section-title">Your Performance Overview</h2>

          {error ? (
            <div className="sra-banner-error" role="alert">
              {error}
            </div>
          ) : null}

          <div className="sra-metrics">
            <div className="sra-metric sra-metric--purple">
              <h3 className="sra-metric-label">Average Speed</h3>
              <p className="sra-metric-value">
                {loading ? (
                  <span className="sra-loading">Loading…</span>
                ) : (
                  <>
                    {formatSpeed()}{' '}
                    <span className="sra-metric-unit">Q/min</span>
                  </>
                )}
              </p>
            </div>
            <div className="sra-metric sra-metric--blue">
              <h3 className="sra-metric-label">Overall Accuracy</h3>
              <p className="sra-metric-value">
                {loading ? (
                  <span className="sra-loading">Loading…</span>
                ) : (
                  <>
                    {formatAccuracy()}
                    <span className="sra-metric-unit">%</span>
                  </>
                )}
              </p>
            </div>
          </div>

          <div className="sra-chart-wrap">
            <h3 className="sra-chart-heading">Performance Breakdown</h3>
            {!loading && showPieChart && pieData ? (
              <div className="sra-chart-canvas">
                <Pie data={pieData} options={pieOptions} />
              </div>
            ) : null}
            {!loading && showPieChart ? (
              <p className="sra-chart-hint">Tip: click chart segments to open Results.</p>
            ) : null}
            {!loading && !showPieChart ? (
              <p className="sra-chart-msg sra-chart-msg--warn" role="status">
                No sufficient data available to display the performance breakdown chart.
              </p>
            ) : null}
          </div>

          <div className="sra-chart-wrap sra-chart-wrap--trend">
            <h3 className="sra-chart-heading">Performance Trend Over Exams (Accuracy)</h3>
            {!loading && barData ? (
              <div className="sra-chart-canvas sra-chart-canvas--bar">
                <Bar data={barData} options={barOptions} />
              </div>
            ) : null}
            {!loading && barData ? (
              <p className="sra-chart-hint">Tip: click a bar to open that exam in Results.</p>
            ) : null}
            {!loading && !examScores.length ? (
              <p className="sra-chart-msg sra-chart-msg--warn" role="status">
                No exam history available to display performance trend.
              </p>
            ) : null}
          </div>
        </section>
      </main>
    </div>
  );
}
