import React, { useEffect, useState } from 'react';
import { api } from '../../api/client.js';
import './AdminChatbotPage.css';

export function AdminChatbotPage() {
  const [rows, setRows] = useState([]);
  const [jsonText, setJsonText] = useState('{}');
  const [msg, setMsg] = useState('');
  const [loading, setLoading] = useState(false);

  async function load() {
    setLoading(true);
    setMsg('');
    try {
      const res = await api.get('/chatbot/responses');
      setRows(res.data?.responses || []);
    } catch (err) {
      setMsg(err?.response?.data?.message || 'Failed to load');
      setRows([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  async function save() {
    let payload;
    try {
      payload = JSON.parse(jsonText || '{}');
    } catch {
      setMsg('Invalid JSON');
      return;
    }
    setLoading(true);
    setMsg('');
    try {
      const res = await api.post('/chatbot/responses', { payload });
      setMsg(res.data?.message || 'Saved');
      setJsonText('{}');
      await load();
    } catch (err) {
      setMsg(err?.response?.data?.message || 'Save failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="admin-chatbot-page">
      <h2 className="admin-chatbot-title">Chatbot Panel</h2>
      <p className="admin-chatbot-subtitle">
        Stored in <code>server/chatbot-responses.json</code> (same store as legacy save/fetch PHP aliases).
      </p>

      <div className="admin-chatbot-actions">
        <button
          type="button"
          onClick={() => void load()}
          disabled={loading}
          className="admin-chatbot-btn admin-chatbot-btn-outline"
        >
          Refresh
        </button>
        <button
          type="button"
          onClick={() => {
            setMsg('');
            setJsonText(
              JSON.stringify(
                {
                  keywords: ['exam', 'start', 'help'],
                  answer: 'Open Student Dashboard, pick your domain, refresh the list, then tap Start Exam on your paper.'
                },
                null,
                2
              )
            );
          }}
          disabled={loading}
          className="admin-chatbot-btn admin-chatbot-btn-soft"
        >
          Insert sample rule
        </button>
      </div>

      {msg ? <div className="admin-chatbot-msg">{msg}</div> : null}
      {loading && rows.length === 0 ? <div className="admin-chatbot-loading">Loading…</div> : null}

      <div className="admin-chatbot-card">
        <div className="admin-chatbot-card-title">Append entry (JSON object)</div>
        <textarea
          value={jsonText}
          onChange={(e) => setJsonText(e.target.value)}
          rows={6}
          className="admin-chatbot-textarea"
        />
        <button
          type="button"
          onClick={() => void save()}
          disabled={loading}
          className="admin-chatbot-btn admin-chatbot-btn-primary admin-chatbot-top"
        >
          Save to log
        </button>
      </div>

      <div className="admin-chatbot-card">
        <h3 className="admin-chatbot-history-title">Chatbot History</h3>
        <div className="admin-chatbot-history">
          {rows.map((r, i) => (
            <div key={i} className="admin-chatbot-row">
              <div className="admin-chatbot-row-time">{r.at || '—'}</div>
              <pre className="admin-chatbot-row-pre">
                {JSON.stringify(r.payload ?? r, null, 2)}
              </pre>
            </div>
          ))}
          {!rows.length && !loading ? <div className="admin-chatbot-loading">No entries yet.</div> : null}
        </div>
      </div>
    </div>
  );
}
