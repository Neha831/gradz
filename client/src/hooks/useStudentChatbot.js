import { useCallback, useMemo, useState } from 'react';
import { api } from '../api/client.js';

export const STUDENT_CHATBOT_DEFAULT_REPLY =
  "I couldn't find a matching answer. Try different keywords, check the FAQs, or use Contact Us for help.";

function collectFaqRules(obj, out) {
  if (!obj || typeof obj !== 'object') return;
  if (Array.isArray(obj.keywords) && typeof obj.answer === 'string') {
    out.push({ keywords: obj.keywords, answer: obj.answer });
    return;
  }
  if (Array.isArray(obj)) {
    for (const item of obj) collectFaqRules(item, out);
    return;
  }
  for (const v of Object.values(obj)) {
    if (v && typeof v === 'object') collectFaqRules(v, out);
  }
}

export function rulesFromResponses(rows) {
  const out = [];
  for (const row of rows) {
    const p = row.payload ?? row;
    if (p?.kind === 'student_message') continue;
    collectFaqRules(p, out);
  }
  return out;
}

export function matchAnswer(query, rules) {
  const q = query.toLowerCase().trim();
  if (!q) return null;
  for (const r of rules) {
    for (const kw of r.keywords || []) {
      if (q.includes(String(kw).toLowerCase().trim())) return r.answer;
    }
  }
  return null;
}

export function useStudentChatbot() {
  const [historyRows, setHistoryRows] = useState([]);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [historyLoading, setHistoryLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [bootErr, setBootErr] = useState('');

  const faqRules = useMemo(() => rulesFromResponses(historyRows), [historyRows]);

  const loadHistory = useCallback(async () => {
    setHistoryLoading(true);
    setBootErr('');
    try {
      const res = await api.get('/chatbot/history');
      setHistoryRows(res.data?.responses || []);
    } catch (err) {
      setBootErr(err?.response?.data?.message || 'Failed to load chatbot data');
      setHistoryRows([]);
    } finally {
      setHistoryLoading(false);
    }
  }, []);

  const send = useCallback(async () => {
    const text = input.trim();
    if (!text || sending || historyLoading) return;
    setInput('');
    setMessages((m) => [...m, { side: 'user', text, at: Date.now() }]);
    setSending(true);

    try {
      await api.post('/chatbot/message', { text }).catch(() => {});
      const res = await api.get('/chatbot/history');
      const rows = res.data?.responses || [];
      setHistoryRows(rows);
      const rules = rulesFromResponses(rows);
      const answer = matchAnswer(text, rules) || STUDENT_CHATBOT_DEFAULT_REPLY;
      setMessages((m) => [...m, { side: 'bot', text: answer, at: Date.now() }]);
    } catch {
      const answer = matchAnswer(text, faqRules) || STUDENT_CHATBOT_DEFAULT_REPLY;
      setMessages((m) => [...m, { side: 'bot', text: answer, at: Date.now() }]);
    } finally {
      setSending(false);
    }
  }, [input, sending, historyLoading, faqRules]);

  return {
    historyRows,
    messages,
    setMessages,
    input,
    setInput,
    historyLoading,
    sending,
    bootErr,
    faqRules,
    loadHistory,
    send
  };
}
