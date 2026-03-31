import React, { useEffect, useState } from 'react';
import { Outlet, NavLink, useLocation, useNavigate } from 'react-router-dom';
import {
  FaAddressBook,
  FaBars,
  FaChartLine,
  FaCircleQuestion,
  FaFileCircleQuestion,
  FaGauge,
  FaRightFromBracket,
  FaUsers,
  FaXmark
} from 'react-icons/fa6';
import { useAuth } from '../auth/useAuth.js';
import { BrandMark } from '../components/BrandMark.jsx';
import { adminRoute } from '../constants/adminRoutes.js';
import './AdminLayout.css';

export function AdminLayout() {
  const { signOut, user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
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

  const navClass = ({ isActive }) =>
    `admin-nav-link${isActive ? ' admin-nav-link-active' : ''}`;

  return (
    <div className="admin-layout-page">
      <header className="admin-mobile-header">
        <button
          type="button"
          className="admin-mobile-menu-btn"
          onClick={() => setMobileNavOpen(true)}
          aria-label="Open menu"
          aria-expanded={mobileNavOpen}
          aria-controls="admin-sidebar"
        >
          <FaBars aria-hidden="true" />
        </button>
        <BrandMark
          className="admin-mobile-header-brand"
          logoClassName="admin-mobile-header-logo"
          wordmarkClassName="admin-mobile-header-wordmark"
          gradClassName="admin-mobile-header-grad"
          ezyClassName="admin-mobile-header-ezy"
          logoWidth={46}
          logoHeight={46}
        />
      </header>

      <div
        className={`admin-sidebar-backdrop${mobileNavOpen ? ' admin-sidebar-backdrop--visible' : ''}`}
        aria-hidden="true"
        onClick={() => setMobileNavOpen(false)}
      />

      <div className="admin-layout-shell">
        <aside
          id="admin-sidebar"
          className={`admin-sidebar${mobileNavOpen ? ' admin-sidebar--open' : ''}`}
        >
          <div className="admin-sidebar-mobile-top">
            <button
              type="button"
              className="admin-sidebar-close-btn"
              onClick={() => setMobileNavOpen(false)}
              aria-label="Close menu"
            >
              <FaXmark aria-hidden="true" />
            </button>
          </div>
          <BrandMark
            className="admin-brand"
            logoClassName="admin-brand-logo-img"
            wordmarkClassName="admin-brand-wordmark"
            gradClassName="admin-brand-grad"
            ezyClassName="admin-brand-ezy"
            logoWidth={52}
            logoHeight={52}
          />
          <nav className="admin-nav" id="admin-sidebar-nav">
            <NavLink to={adminRoute()} end className={navClass} onClick={() => setMobileNavOpen(false)}>
              <FaGauge className="admin-nav-icon" aria-hidden="true" />
              Dashboard
            </NavLink>
            <NavLink to={adminRoute('questions')} className={navClass} onClick={() => setMobileNavOpen(false)}>
              <FaFileCircleQuestion className="admin-nav-icon" aria-hidden="true" />
              Exams
            </NavLink>
            <NavLink to={adminRoute('students')} className={navClass} onClick={() => setMobileNavOpen(false)}>
              <FaUsers className="admin-nav-icon" aria-hidden="true" />
              Students
            </NavLink>
            <NavLink to={adminRoute('contact')} className={navClass} onClick={() => setMobileNavOpen(false)}>
              <FaAddressBook className="admin-nav-icon" aria-hidden="true" />
              Contact Us
            </NavLink>
            <NavLink to={adminRoute('faq')} className={navClass} onClick={() => setMobileNavOpen(false)}>
              <FaCircleQuestion className="admin-nav-icon" aria-hidden="true" />
              FAQs
            </NavLink>
            <NavLink to={adminRoute('allocate')} className={navClass} onClick={() => setMobileNavOpen(false)}>
              <FaChartLine className="admin-nav-icon" aria-hidden="true" />
              Select Domain
            </NavLink>
          </nav>
          <div className="admin-logout-wrap">
            <button
              onClick={() => {
                if (confirm('Are you sure you want to logout?')) {
                  setMobileNavOpen(false);
                  signOut();
                  navigate('/');
                }
              }}
              className="admin-logout-btn"
            >
              <FaRightFromBracket className="admin-nav-icon" aria-hidden="true" />
              Logout
            </button>
          </div>
          <div className="admin-signed-in">
            Signed in as: {user?.email || 'admin'}
          </div>
        </aside>

        <main className="admin-main">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

