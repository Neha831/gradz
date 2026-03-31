import React, { useEffect, useState } from 'react';
import { api } from '../../api/client.js';
import { Link } from 'react-router-dom';
import {
  FaCamera,
  FaChartColumn,
  FaCircleQuestion,
  FaLayerGroup,
  FaSquarePlus,
  FaUsers
} from 'react-icons/fa6';
import { adminRoute } from '../../constants/adminRoutes.js';
import './AdminDashboardPage.css';

export function AdminDashboardPage() {
  const [stats, setStats] = useState({
    total_students: 0,
    total_exams: 0,
    total_questions: 0,
    total_submissions: 0
  });

  useEffect(() => {
    async function load() {
      const res = await api.get('/admin/stats');
      setStats(res.data?.stats || {});
    }
    load().catch(() => {
      setStats({
        total_students: 0,
        total_exams: 0,
        total_questions: 0,
        total_submissions: 0
      });
    });
  }, []);

  const quickActions = [
    {
      to: adminRoute('questions/setup'),
      title: 'Add New Exam',
      desc: 'Create and configure a new test for your students.',
      icon: <FaSquarePlus />,
      tone: 'blue'
    },
    {
      to: adminRoute('students'),
      title: 'Student Management',
      desc: 'Add students, view all enrollments, results, and exam snapshots.',
      icon: <FaUsers />,
      tone: 'green'
    },
    {
      to: adminRoute('allocate'),
      title: 'Select Domain',
      desc: 'Allocate an existing exam to a specific student domain.',
      icon: <FaLayerGroup />,
      tone: 'sky'
    },
    {
      to: adminRoute('results'),
      title: 'Show Results',
      desc: 'View and manage the results of completed exams.',
      icon: <FaChartColumn />,
      tone: 'orange'
    },
    {
      to: adminRoute('questions/manage'),
      title: 'Manage Questions',
      desc: 'Add, edit, or remove questions from your question bank.',
      icon: <FaCircleQuestion />,
      tone: 'purple'
    },
    {
      to: adminRoute('snapshots'),
      title: 'View Exam Snapshots',
      desc: 'Review proctoring snapshots from exam sessions.',
      icon: <FaCamera />,
      tone: 'red'
    }
  ];

  return (
    <div className="admin-dashboard-page">
      <h2 className="admin-dashboard-title">Admin Dashboard</h2>
      <div className="admin-stat-grid">
        <div className="admin-stat-card admin-stat-compact admin-stat-accent-blue">
          <div className="admin-stat-label">Active Exams</div>
          <div className="admin-stat-value">{stats.total_exams}</div>
        </div>
        <div className="admin-stat-card admin-stat-compact admin-stat-accent-green">
          <div className="admin-stat-label">Total Students</div>
          <div className="admin-stat-value">{stats.total_students}</div>
        </div>
      </div>

      <div className="admin-section-title">Quick Actions</div>
      <div className="admin-dashboard-grid">
        {quickActions.map((item) => (
          <Link key={item.title} to={item.to} className="admin-quick-card">
            <div className={`admin-quick-icon admin-quick-icon--${item.tone}`}>{item.icon}</div>
            <div className="admin-quick-title">{item.title}</div>
            <div className="admin-quick-desc">{item.desc}</div>
          </Link>
        ))}
      </div>
    </div>
  );
}

