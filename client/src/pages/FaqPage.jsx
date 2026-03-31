import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../auth/useAuth.js';
import { adminRoute } from '../constants/adminRoutes.js';
import { studentRoute } from '../constants/studentRoutes.js';
import './FaqPage.css';

const FAQS = [
  {
    q: 'How do I reset my password?',
    a: 'Use Forgot password on the login screen. You will need the security question and answer you set at registration.'
  },
  {
    q: 'Is there a quick help chat?',
    a: 'Students can open Help assistant in the sidebar for keyword-based answers configured by your admin.'
  },
  {
    q: 'How do I start an exam?',
    a: 'Go to Student Dashboard, pick your domain, refresh exams, and click Start Exam.'
  },
  {
    q: 'What happens if time runs out?',
    a: 'The exam is auto-submitted when the timer reaches zero.'
  },
  {
    q: 'Can admin allocate exam by domain?',
    a: 'Yes. Use Allocate Exam Domain and set a domain for an exam code.'
  },
  {
    q: 'Are webcam snapshots stored?',
    a: 'Yes, snapshots are uploaded periodically during active exams and can be viewed by admin.'
  }
];

export function FaqPage() {
  const { user } = useAuth();

  return (
    <div className="faq-page">
      <h2 className="faq-title">FAQs</h2>
      {user?.role === 'student' ? (
        <div className="faq-chatbot-link-wrap">
          <Link to={studentRoute('chatbot')} className="faq-chatbot-link">
            Open Help assistant
          </Link>
        </div>
      ) : user?.role === 'admin' ? (
        <div className="faq-chatbot-link-wrap">
          <Link to={adminRoute('chatbot')} className="faq-chatbot-link">
            Chatbot log (admin)
          </Link>
        </div>
      ) : null}
      <div className="faq-grid">
        {FAQS.map((f, i) => (
          <div key={i} className="faq-item">
            <div className="faq-question">{f.q}</div>
            <div className="faq-answer">{f.a}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

