import React, { useEffect } from 'react';
import { useAuth } from '../../auth/useAuth.js';
import { useStudentChatbot } from '../../hooks/useStudentChatbot.js';
import './StudentChatbotPage.css';

export function StudentChatbotPage() {
  const { user } = useAuth();
  const {
    messages,
    input,
    setInput,
    historyLoading,
    sending,
    bootErr,
    faqRules,
    loadHistory,
    send
  } = useStudentChatbot();

  useEffect(() => {
    void loadHistory();
  }, [loadHistory]);

  const busy = historyLoading || sending;

  return (
    <div className="student-chat-page">
      <h2 className="student-chat-title">Help assistant</h2>
      <p className="student-chat-subtitle">
        Answers come from keyword rules your admin configures (same store as the legacy chatbot). Your messages are
        logged for support.
      </p>

      <div className="student-chat-actions">
        <button
          type="button"
          onClick={() => void loadHistory()}
          disabled={busy}
          className="student-chat-btn student-chat-btn-outline"
        >
          Reload rules
        </button>
        <span className="student-chat-rules">
          {faqRules.length} keyword rule{faqRules.length === 1 ? '' : 's'} loaded
        </span>
      </div>

      {bootErr ? <div className="student-chat-error">{bootErr}</div> : null}

      <div className="student-chat-box">
        {!messages.length && !busy ? (
          <div className="student-chat-hint">
            Hi{user?.email ? ` ${user.email.split('@')[0]}` : ''}. Ask about exams, domains, or use keywords from the FAQ.
          </div>
        ) : null}
        {messages.map((msg, idx) => (
          <div
            key={`${msg.at}-${msg.side}-${idx}`}
            className={`student-chat-bubble ${msg.side === 'user' ? 'student-chat-bubble-user' : 'student-chat-bubble-bot'}`}
          >
            {msg.text}
          </div>
        ))}
      </div>

      <div className="student-chat-input-row">
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              void send();
            }
          }}
          rows={2}
          placeholder="Type a message… (Enter to send)"
          className="student-chat-textarea"
        />
        <button
          type="button"
          onClick={() => void send()}
          disabled={busy || !input.trim()}
          className={`student-chat-btn student-chat-btn-send ${busy || !input.trim() ? 'student-chat-btn-disabled' : ''}`}
        >
          Send
        </button>
      </div>
    </div>
  );
}
