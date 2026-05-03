import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext.jsx';
import { getBotReply, DEFAULT_SUGGESTIONS } from '../utils/chatbotLogic.js';

function makeId() {
  return `m-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

function makeGreeting(khutbah) {
  return {
    id: makeId(),
    role: 'assistant',
    content: khutbah
      ? `Assalāmu ʿalaykum. I can help you understand "${khutbah.title}". What would you like to know?`
      : 'Capture your first khutbah from the Live page, then come back here to discuss it.',
    suggestions: khutbah ? DEFAULT_SUGGESTIONS : [],
  };
}

export default function Chatbot() {
  const navigate = useNavigate();
  const {
    khutbahs,
    activeKhutbahId,
    setActiveKhutbahId,
    getKhutbah,
    getChat,
    setChat,
    resetChat,
  } = useApp();
  const khutbah = getKhutbah(activeKhutbahId) ?? khutbahs[0] ?? null;
  const isEmpty = khutbahs.length === 0;

  const stored = useMemo(
    () => (khutbah ? getChat(khutbah.id) : []),
    [khutbah?.id, getChat]
  );
  const messages = stored.length ? stored : [makeGreeting(khutbah)];

  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const scrollerRef = useRef(null);

  useEffect(() => {
    if (scrollerRef.current) {
      scrollerRef.current.scrollTop = scrollerRef.current.scrollHeight;
    }
  }, [messages, busy]);

  const persist = (next) => {
    if (khutbah) setChat(khutbah.id, next);
  };

  const send = async (text) => {
    const content = text.trim();
    if (!content || busy || !khutbah) return;

    const userMsg = { id: makeId(), role: 'user', content };
    const next = [...messages, userMsg];
    persist(next);
    setInput('');
    setBusy(true);

    const history = next
      .filter((m) => m.role === 'user' || m.role === 'assistant')
      .slice(-12)
      .map((m) => ({ role: m.role, content: m.content }));

    const { content: replyContent, suggestions } = await getBotReply(history, khutbah);

    persist([
      ...next,
      { id: makeId(), role: 'assistant', content: replyContent, suggestions },
    ]);
    setBusy(false);
  };

  const clearChat = () => {
    if (!khutbah) return;
    resetChat(khutbah.id);
  };

  return (
    <div className="chat-shell">
      <div className="chat-context">
        <div>
          <div className="chat-context-label">Discussing</div>
          <div className="chat-context-title">
            {khutbah ? khutbah.title : 'No khutbah selected'}
          </div>
          {khutbah && (
            <div style={{ fontSize: '0.82rem', color: '#7a8178', marginTop: '0.15rem' }}>
              {khutbah.topic}
            </div>
          )}
        </div>
        <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
          {isEmpty ? (
            <button className="btn btn-primary" onClick={() => navigate('/transcript')}>
              Capture a khutbah
            </button>
          ) : (
            <>
              <select
                value={activeKhutbahId ?? ''}
                onChange={(e) => setActiveKhutbahId(e.target.value)}
                style={{
                  padding: '0.5rem 0.7rem',
                  border: '1px solid #e4ded0',
                  borderRadius: '10px',
                  background: '#ffffff',
                }}
              >
                {khutbahs.map((k) => (
                  <option key={k.id} value={k.id}>
                    {k.title}
                  </option>
                ))}
              </select>
              {khutbah && stored.length > 0 && (
                <button className="btn btn-ghost" onClick={clearChat} disabled={busy}>
                  Clear chat
                </button>
              )}
              {khutbah && (
                <button
                  className="btn btn-ghost"
                  onClick={() => navigate(`/khutbah/${khutbah.id}`)}
                >
                  View
                </button>
              )}
            </>
          )}
        </div>
      </div>

      <div className="chat-messages" ref={scrollerRef}>
        {messages.map((m) => (
          <div
            key={m.id}
            className={`bubble ${m.role === 'user' ? 'bubble-user' : 'bubble-assistant'}`}
          >
            {m.content}
            {m.role === 'assistant' && m.suggestions?.length > 0 && (
              <div className="bubble-suggestions">
                {m.suggestions.map((s) => (
                  <button
                    key={s}
                    className="suggestion-chip"
                    onClick={() => send(s)}
                    disabled={busy}
                  >
                    {s}
                  </button>
                ))}
              </div>
            )}
          </div>
        ))}
        {busy && (
          <div className="bubble bubble-assistant" style={{ fontStyle: 'italic', color: '#7a8178' }}>
            thinking…
          </div>
        )}
      </div>

      <form
        className="chat-input"
        onSubmit={(e) => {
          e.preventDefault();
          send(input);
        }}
      >
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask about this khutbah…"
          disabled={!khutbah || busy}
        />
        <button
          type="submit"
          className="btn btn-primary"
          disabled={!input.trim() || !khutbah || busy}
        >
          Send
        </button>
      </form>
    </div>
  );
}
