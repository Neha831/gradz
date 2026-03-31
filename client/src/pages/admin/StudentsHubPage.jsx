import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { FaCamera, FaChartColumn, FaUserPlus, FaUsers } from 'react-icons/fa6';
import { adminRoute } from '../../constants/adminRoutes.js';
import './StudentsHubPage.css';

export function StudentsHubPage() {
  const navigate = useNavigate();

  return (
    <div className="students-hub-page">
      <div className="students-hub-head">
        <div className="students-hub-head-text">
          <h1 className="students-hub-title">Student Management</h1>
          <p className="students-hub-subtitle">
            Use the actions below to manage students, view exams, and check results.
          </p>
        </div>
        <button
          type="button"
          className="students-hub-back-dashboard"
          onClick={() => navigate(adminRoute())}
        >
          Back to Dashboard
        </button>
      </div>

      <div className="students-hub-cards">
        <Link to={adminRoute('students/add')} className="students-hub-card">
          <div className="students-hub-icon students-hub-icon-green">
            <FaUserPlus aria-hidden="true" />
          </div>
          <div className="students-hub-card-title">Add Student</div>
          <p className="students-hub-card-desc">Enroll a new student into the portal by adding their details.</p>
        </Link>

        <Link to={adminRoute('results')} className="students-hub-card">
          <div className="students-hub-icon students-hub-icon-orange">
            <FaChartColumn aria-hidden="true" />
          </div>
          <div className="students-hub-card-title">Show Results</div>
          <p className="students-hub-card-desc">View, manage, and analyze the results of completed exams.</p>
        </Link>

        <Link to={adminRoute('snapshots')} className="students-hub-card">
          <div className="students-hub-icon students-hub-icon-red">
            <FaCamera aria-hidden="true" />
          </div>
          <div className="students-hub-card-title">View Exam Snapshots</div>
          <p className="students-hub-card-desc">Review proctoring snapshots from various exam sessions.</p>
        </Link>

        <Link to={adminRoute('students/manage')} className="students-hub-card">
          <div className="students-hub-icon students-hub-icon-teal">
            <FaUsers aria-hidden="true" />
          </div>
          <div className="students-hub-card-title">Manage Students</div>
          <p className="students-hub-card-desc">See a complete list of all students enrolled in the system.</p>
        </Link>
      </div>
    </div>
  );
}
