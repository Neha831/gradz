import React from 'react';
import { Link } from 'react-router-dom';
import { FaBullseye, FaListUl } from 'react-icons/fa6';
import { adminRoute } from '../../constants/adminRoutes.js';
import './ExamsHubPage.css';

export function ExamsHubPage() {
  return (
    <div className="exams-hub-page">
      <h1 className="exams-hub-title">Exams (Online &amp; OMR)</h1>
      <p className="exams-hub-section-label">Exam Management</p>

      <div className="exams-hub-cards">
        <Link to={adminRoute('questions/setup')} className="exams-hub-card">
          <div className="exams-hub-icon exams-hub-icon-blue">
            <FaBullseye aria-hidden="true" />
          </div>
          <div className="exams-hub-card-title">Create New Exam</div>
          <p className="exams-hub-card-desc">Set up a new online or OMR-based exam from scratch.</p>
        </Link>

        <Link to={adminRoute('questions/manage')} className="exams-hub-card">
          <div className="exams-hub-icon exams-hub-icon-teal">
            <FaListUl aria-hidden="true" />
          </div>
          <div className="exams-hub-card-title">Manage Questions</div>
          <p className="exams-hub-card-desc">Add, edit, or view questions in your question bank.</p>
        </Link>
      </div>
    </div>
  );
}
