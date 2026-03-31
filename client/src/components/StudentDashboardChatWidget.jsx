import React, { useEffect, useRef, useState } from 'react';
import { FaComments, FaPaperPlane, FaRobot, FaXmark } from 'react-icons/fa6';
import { useStudentChatbot } from '../hooks/useStudentChatbot.js';
import './StudentDashboardChatWidget.css';

const WELCOME_LINES = ['Hi there! 👋', 'How can I help you today?'];

export function StudentDashboardChatWidget() {
  const [open, setOpen] = useState(false);
  const listRef = useRef(null);
  const {
    messages,
    input,
    setInput,
    historyLoading,
    sending,
    bootErr,
    loadHistory,
    send
  } = useStudentChatbot();

  useEffect(() => {
    void loadHistory();
  }, [loadHistory]);

  useEffect(() => {
    if (!open) return;
    const el = listRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [open, messages, sending]);

  const busy = sending;
  const canSend = input.trim() && !busy && !historyLoading;

  return (
    <div className="sd-chat-widget" aria-live="polite">
      {open ? (
        <div className="sd-chat-panel" role="dialog" aria-label="Chat Assistant">
          <header className="sd-chat-header">
            <span className="sd-chat-header-title">Chat Assistant</span>
            <button
              type="button"
              className="sd-chat-header-close"
              aria-label="Close chat"
              onClick={() => setOpen(false)}
            >
              <FaXmark aria-hidden="true" />
            </button>
          </header>

          <div className="sd-chat-body" ref={listRef}>
            <div className="sd-chat-welcome">
              <div className="sd-chat-bot-row">
                <div className="sd-chat-bot-avatar" aria-hidden="true">
                  <FaRobot />
                </div>
                <div className="sd-chat-bubble sd-chat-bubble-bot">
                  {WELCOME_LINES.map((line, i) => (
                    <p key={i} className="sd-chat-welcome-line">
                      {line}
                    </p>
                  ))}
                </div>
              </div>
            </div>

            {bootErr ? <div className="sd-chat-inline-err">{bootErr}</div> : null}

            {messages.map((msg, idx) => (
              <div
                key={`${msg.at}-${msg.side}-${idx}`}
                className={`sd-chat-turn ${msg.side === 'user' ? 'sd-chat-turn-user' : 'sd-chat-turn-bot'}`}
              >
                {msg.side === 'bot' ? (
                  <div className="sd-chat-bot-avatar sd-chat-bot-avatar--sm" aria-hidden="true">
                    <FaRobot />
                  </div>
                ) : null}
                <div className={`sd-chat-bubble ${msg.side === 'user' ? 'sd-chat-bubble-user' : 'sd-chat-bubble-bot'}`}>
                  {msg.text}
                </div>
              </div>
            ))}

            {sending ? (
              <div className="sd-chat-turn sd-chat-turn-bot">
                <div className="sd-chat-bot-avatar sd-chat-bot-avatar--sm" aria-hidden="true">
                  <FaRobot />
                </div>
                <div className="sd-chat-bubble sd-chat-bubble-bot sd-chat-typing">Thinking…</div>
              </div>
            ) : null}
          </div>

          <footer className="sd-chat-footer">
            <input
              type="text"
              className="sd-chat-input"
              placeholder="Enter a message..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  void send();
                }
              }}
              disabled={busy}
              aria-label="Message"
            />
            <button
              type="button"
              className="sd-chat-send"
              aria-label="Send message"
              disabled={!canSend}
              onClick={() => void send()}
            >
              <FaPaperPlane aria-hidden="true" />
            </button>
          </footer>
        </div>
      ) : null}

      <button
        type="button"
        className={`sd-chat-fab${open ? ' sd-chat-fab--open' : ''}`}
        aria-label={open ? 'Close chat assistant' : 'Open chat assistant'}
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
      >
        {open ? <FaXmark aria-hidden="true" /> : <FaComments aria-hidden="true" />}
      </button>
    </div>
  );
}
