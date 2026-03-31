import React, { useEffect, useState } from 'react';
import { Outlet, NavLink, useLocation, useNavigate } from 'react-router-dom';
import {
  FaBars,
  FaChartLine,
  FaChartPie,
  FaChevronDown,
  FaChevronRight,
  FaCircleQuestion,
  FaFileLines,
  FaListCheck,
  FaPlay,
  FaRightFromBracket,
  FaUser,
  FaAddressBook,
  FaXmark
} from 'react-icons/fa6';
import { useAuth } from '../auth/useAuth.js';
import { BrandMark } from '../components/BrandMark.jsx';
import { studentRoute } from '../constants/studentRoutes.js';
import './StudentLayout.css';

export function StudentLayout() {
  const { signOut, user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [isMoreOpen, setIsMoreOpen] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  useEffect(() => {
    setMobileNavOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    if (!mobileNavOpen) return undefined;
    const onKey = (e) => {
      if (e.key === 'Escape') setMobileNavOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [mobileNavOpen]);

  useEffect(() => {
    if (!mobileNavOpen) return undefined;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [mobileNavOpen]);
  const initials = String(user?.full_name || 'S')
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((x) => x[0]?.toUpperCase() || '')
    .join('');

  const navClass = ({ isActive }) =>
    `student-nav-link${isActive ? ' student-nav-link-active' : ''}`;

  const closeMobile = () => setMobileNavOpen(false);

  return (
    <div className="student-layout-page">
      <header className="student-mobile-header">
        <button
          type="button"
          className="student-mobile-menu-btn"
          onClick={() => setMobileNavOpen(true)}
          aria-label="Open menu"
          aria-expanded={mobileNavOpen}
          aria-controls="student-sidebar"
        >
          <FaBars aria-hidden="true" />
        </button>
        <div className="student-mobile-header-spacer">
          <BrandMark
            className="student-mobile-header-brand"
            logoClassName="student-mobile-header-logo"
            wordmarkClassName="student-mobile-header-wordmark"
            gradClassName="student-mobile-header-grad"
            ezyClassName="student-mobile-header-ezy"
            logoWidth={46}
            logoHeight={46}
          />
        </div>
      </header>

      <div
        className={`student-sidebar-backdrop${mobileNavOpen ? ' student-sidebar-backdrop--visible' : ''}`}
        aria-hidden="true"
        onClick={() => setMobileNavOpen(false)}
      />

      <div className="student-layout-shell">
        <aside
          id="student-sidebar"
          className={`student-sidebar${mobileNavOpen ? ' student-sidebar--open' : ''}`}
        >
          <div className="student-sidebar-mobile-top">
            <button
              type="button"
              className="student-sidebar-close-btn"
              onClick={() => setMobileNavOpen(false)}
              aria-label="Close menu"
            >
              <FaXmark aria-hidden="true" />
            </button>
          </div>
          <BrandMark
            className="student-brand"
            logoClassName="student-brand-logo-img"
            wordmarkClassName="student-brand-wordmark"
            gradClassName="student-brand-grad"
            ezyClassName="student-brand-ezy"
            logoWidth={52}
            logoHeight={52}
          />
          <nav className="student-nav" id="student-sidebar-nav">
            <NavLink to={studentRoute()} end className={navClass} onClick={closeMobile}>
              <FaChartLine className="student-nav-icon" aria-hidden="true" />
              Dashboard
            </NavLink>
            <NavLink to={studentRoute('exam')} className={navClass} onClick={closeMobile}>
              <FaPlay className="student-nav-icon" aria-hidden="true" />
              Take Exam
            </NavLink>
            <NavLink to={studentRoute('exams')} className={navClass} onClick={closeMobile}>
              <FaFileLines className="student-nav-icon" aria-hidden="true" />
              Exam List
            </NavLink>
            <NavLink to={studentRoute('results')} className={navClass} onClick={closeMobile}>
              <FaListCheck className="student-nav-icon" aria-hidden="true" />
              Results
            </NavLink>
            <NavLink to={studentRoute('result-analysis')} className={navClass} onClick={closeMobile}>
              <FaChartPie className="student-nav-icon" aria-hidden="true" />
              Result Analysis
            </NavLink>
            <NavLink to={studentRoute('profile')} className={navClass} onClick={closeMobile}>
              <FaUser className="student-nav-icon" aria-hidden="true" />
              Profile
            </NavLink>
            <button
              type="button"
              className="student-nav-more"
              onClick={() => setIsMoreOpen((prev) => !prev)}
              aria-expanded={isMoreOpen}
              aria-controls="student-more-links"
            >
              <span className="student-nav-more-left">
                <FaChevronRight className="student-nav-icon" aria-hidden="true" />
                More
              </span>
              <span>{isMoreOpen ? <FaChevronDown aria-hidden="true" /> : <FaChevronRight aria-hidden="true" />}</span>
            </button>
            {isMoreOpen ? (
              <div id="student-more-links" className="student-more-links">
                <NavLink
                  to={studentRoute('contact')}
                  className={navClass}
                  onClick={() => {
                    setIsMoreOpen(false);
                    closeMobile();
                  }}
                >
                  <FaAddressBook className="student-nav-icon" aria-hidden="true" />
                  Contact
                </NavLink>
                <NavLink
                  to={studentRoute('faq')}
                  className={navClass}
                  onClick={() => {
                    setIsMoreOpen(false);
                    closeMobile();
                  }}
                >
                  <FaCircleQuestion className="student-nav-icon" aria-hidden="true" />
                  FAQ
                </NavLink>
              </div>
            ) : null}
          </nav>
          <div className="student-logout-wrap">
            <button
              onClick={() => {
                if (confirm('Are you sure you want to logout?')) {
                  setMobileNavOpen(false);
                  signOut();
                  navigate('/');
                }
              }}
              className="student-logout-btn"
            >
              <FaRightFromBracket className="student-nav-icon" aria-hidden="true" />
              Logout
            </button>
          </div>
          <div className="student-signed-in">Signed in as: {user?.email || 'student'} ({initials || 'S'})</div>
        </aside>

        <main className="student-main">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

