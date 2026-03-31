import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { FaBolt, FaChartColumn, FaEnvelope, FaPhone, FaShieldHalved } from 'react-icons/fa6';
import { useAuth } from '../auth/useAuth.js';
import { BrandMark } from '../components/BrandMark.jsx';
import { ADMIN_BASE } from '../constants/adminRoutes.js';
import { STUDENT_BASE } from '../constants/studentRoutes.js';
import './HomePage.css';

export function HomePage() {
  const navigate = useNavigate();
  const { token, user } = useAuth();
  const [preloader, setPreloader] = useState(true);

  useEffect(() => {
    if (token && user?.role === 'admin') {
      navigate(ADMIN_BASE, { replace: true });
      return;
    }
    if (token && user?.role === 'student') {
      navigate(STUDENT_BASE, { replace: true });
    }
  }, [token, user, navigate]);

  useEffect(() => {
    let done = false;
    const finish = () => {
      if (done) return;
      done = true;
      setPreloader(false);
    };
    const minDelay = window.setTimeout(finish, 900);
    if (document.readyState === 'complete') {
      window.setTimeout(finish, 400);
    } else {
      window.addEventListener('load', () => window.setTimeout(finish, 200), { once: true });
    }
    return () => {
      window.clearTimeout(minDelay);
    };
  }, []);

  return (
    <div className="home-page" id="top">
      <div className={`home-preloader${preloader ? ' home-preloader-visible' : ' home-preloader-hide'}`} aria-hidden={!preloader}>
        <div className="home-preloader-inner">
          <BrandMark
            className="home-preloader-brand"
            logoClassName="home-preloader-logo-img"
            wordmarkClassName="home-preloader-wordmark"
            gradClassName="home-preloader-grad"
            ezyClassName="home-preloader-ezy"
            logoWidth={52}
            logoHeight={52}
          />
          <div className="home-preloader-spinner" />
        </div>
      </div>

      <header className="home-nav">
        <BrandMark
          as={Link}
          to="/"
          className="home-nav-brand"
          logoClassName="home-nav-logo-img"
          wordmarkClassName="home-nav-wordmark"
          gradClassName="home-nav-grad"
          ezyClassName="home-nav-ezy"
        />
        <nav className="home-nav-links">
          <a href="#top" className="home-nav-link">
            Home
          </a>
          <a href="#contact" className="home-nav-link">
            Contact
          </a>
          <Link to="/login" className="home-nav-link">
            Login
          </Link>
          <Link to="/register" className="home-nav-link home-nav-link-cta">
            Register
          </Link>
        </nav>
      </header>

      <main>
        <section className="home-hero">
          <h1 className="home-hero-title">
            Welcome to <span className="home-accent">GradEzy</span>
          </h1>
          <p className="home-hero-sub">
            Your one-stop, modern solution for online examinations, insightful results, and powerful analytics.
          </p>
          <Link to="/register" className="home-btn-primary">
            Get Started Free
          </Link>
        </section>

        <section className="home-section home-section-muted" id="about">
          <h2 className="home-section-title">About Us</h2>
          <div className="home-about-text">
            <p>
              GradEzy is built to make online assessments simple, secure, and insightful. Powered by FouriseExam, we help
              institutions run reliable exams with real-time analytics and a smooth experience for both administrators
              and students.
            </p>
            <p>
              Whether you are conducting practice tests or high-stakes evaluations, our platform focuses on security,
              speed, and clarity—so you can focus on outcomes, not overhead.
            </p>
          </div>
        </section>

        <section className="home-section" id="mission">
          <h2 className="home-section-title">Our Core Mission</h2>
          <p className="home-mission-intro">
            We combine robust technology with thoughtful design to deliver assessments you can trust.
          </p>
          <div className="home-mission-cards">
            <div className="home-card">
              <div className="home-card-icon">
                <FaShieldHalved aria-hidden="true" />
              </div>
              <div className="home-card-label">Rock-Solid Security</div>
            </div>
            <div className="home-card">
              <div className="home-card-icon">
                <FaBolt aria-hidden="true" />
              </div>
              <div className="home-card-label">Blazing-Fast Efficiency</div>
            </div>
            <div className="home-card">
              <div className="home-card-icon">
                <FaChartColumn aria-hidden="true" />
              </div>
              <div className="home-card-label">Insightful Analytics</div>
            </div>
          </div>
        </section>

        <section className="home-section home-section-muted" id="founders">
          <h2 className="home-section-title">Meet Our founders</h2>
          <div className="home-founder-cards">
            <div className="home-founder-card">
              <div className="home-founder-name">Mr. Gajanand Birajdar</div>
              <div className="home-founder-role">Founder &amp; Director</div>
            </div>
            <div className="home-founder-card">
              <div className="home-founder-name">Mr. Sunil Deokule</div>
              <div className="home-founder-role">Founder &amp; Director</div>
            </div>
          </div>
        </section>

        <section className="home-section" id="contact">
          <h2 className="home-section-title">Get in Touch</h2>
          <p className="home-contact-intro">We would love to hear from you. Reach out anytime.</p>
          <div className="home-contact-cards">
            <a href="mailto:hello@fouriseexam.com" className="home-contact-card">
              <FaEnvelope className="home-contact-icon" aria-hidden="true" />
              <span>hello@fouriseexam.com</span>
            </a>
            <a href="tel:+919876543210" className="home-contact-card">
              <FaPhone className="home-contact-icon" aria-hidden="true" />
              <span>+91 987 654 3210</span>
            </a>
          </div>
        </section>
      </main>

      <footer className="home-footer">
        <p className="home-footer-copy">
          © 2026 FouriseExam Inc. All Rights Reserved. Innovating Assessments Worldwide.
        </p>
      </footer>
    </div>
  );
}
