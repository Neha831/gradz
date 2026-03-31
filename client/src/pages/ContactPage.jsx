import React, { useState } from 'react';
import { FaEnvelope, FaPhone } from 'react-icons/fa6';
import { api } from '../api/client.js';
import './ContactPage.css';

export function ContactPage() {
  const [form, setForm] = useState({
    name: '',
    email: '',
    message: ''
  });
  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState({ ok: null, text: '' });

  async function submit(e) {
    e.preventDefault();
    setFeedback({ ok: null, text: '' });
    if (!form.name?.trim() || !form.email?.trim() || !form.message?.trim()) {
      setFeedback({ ok: false, text: 'Name, email and message are required.' });
      return;
    }
    setLoading(true);
    try {
      await api.post('/contact', form);
      setFeedback({ ok: true, text: 'Message sent successfully.' });
      setForm({ name: '', email: '', message: '' });
    } catch (err) {
      setFeedback({ ok: false, text: err?.response?.data?.message || 'Failed to send message.' });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="contact-page">
      <div className="contact-head">
        <h2 className="contact-title">Contact Us</h2>
        <p className="contact-subtitle">We're here to help. Reach out to us with any questions.</p>
      </div>

      {feedback.text ? (
        <div
          role={feedback.ok === false ? 'alert' : 'status'}
          className={feedback.ok === true ? 'contact-feedback contact-feedback-ok' : 'contact-feedback contact-feedback-err'}
        >
          {feedback.text}
        </div>
      ) : null}

      <div className="contact-layout">
        <section className="contact-card contact-card-info">
          <h3 className="contact-card-title">Get in Touch</h3>
          <p className="contact-copy">
            Experience the power of easy, reliable, and accurate online testing. Contact us for any queries.
          </p>

          <div className="contact-info-item">
            <span className="contact-icon" aria-hidden="true"><FaPhone /></span>
            <div>
              <div className="contact-info-label">Phone</div>
              <div className="contact-info-value">+91 70207 59254</div>
            </div>
          </div>

          <div className="contact-info-item">
            <span className="contact-icon" aria-hidden="true"><FaEnvelope /></span>
            <div>
              <div className="contact-info-label">Email</div>
              <div className="contact-info-value">support@4ouriseExam.in</div>
            </div>
          </div>
        </section>

        <form onSubmit={submit} className="contact-card contact-card-form">
          <h3 className="contact-card-title">Send us a Message</h3>

          <label className="contact-field-label" htmlFor="contact-name">Name</label>
          <input
            id="contact-name"
            value={form.name}
            onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
            placeholder="Your Name"
            className="contact-input"
          />

          <label className="contact-field-label" htmlFor="contact-email">Email</label>
          <input
            id="contact-email"
            value={form.email}
            onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))}
            placeholder="Your Email"
            type="email"
            className="contact-input"
          />

          <label className="contact-field-label" htmlFor="contact-message">Message</label>
          <textarea
            id="contact-message"
            value={form.message}
            onChange={(e) => setForm((p) => ({ ...p, message: e.target.value }))}
            placeholder="Your Message"
            required
            className="contact-textarea"
          />

          <button
            type="submit"
            disabled={loading}
            className={`contact-submit ${loading ? 'contact-submit-disabled' : ''}`}
          >
            {loading ? 'Sending...' : 'Send Message'}
          </button>
        </form>
      </div>
    </div>
  );
}
