import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { transcriptSegments, languages } from '../data/transcript.js';
import { useApp } from '../context/AppContext.jsx';
import LanguageSelect from '../components/LanguageSelect.jsx';
import {
  createWhisperRecognizer,
  isWhisperConfigured,
} from '../utils/whisperRecognizer.js';
import { translate, isPredominantlyArabic } from '../utils/translator.js';
import { searchQuran } from '../utils/quran.js';
import {
  summarizeTranscript,
  isSummarizerConfigured,
} from '../utils/summarizer.js';

export default function LiveTranscript() {
  const { preferredLanguage, setPreferredLanguage } = useApp();
  const [mode, setMode] = useState('demo');

  return (
    <div className="page page-narrow">
      <div className="page-header">
        <h1>Live Translation</h1>
        <p>
          Follow the khutbah in your language. Arabic passages stay in the
          original script with translation directly below.
        </p>
      </div>

      <div className="mode-tabs">
        <button
          className={`mode-tab ${mode === 'demo' ? 'active' : ''}`}
          onClick={() => setMode('demo')}
        >
          Demo
        </button>
        <button
          className={`mode-tab ${mode === 'live' ? 'active' : ''}`}
          onClick={() => setMode('live')}
        >
          Live (Mic)
        </button>
      </div>

      {mode === 'demo' ? (
        <DemoMode
          preferredLanguage={preferredLanguage}
          setPreferredLanguage={setPreferredLanguage}
        />
      ) : (
        <LiveMicMode
          preferredLanguage={preferredLanguage}
          setPreferredLanguage={setPreferredLanguage}
        />
      )}
    </div>
  );
}

function DemoMode({ preferredLanguage, setPreferredLanguage }) {
  const [visibleCount, setVisibleCount] = useState(1);
  const [isPlaying, setIsPlaying] = useState(true);
  const bottomRef = useRef(null);

  useEffect(() => {
    if (!isPlaying) return;
    if (visibleCount >= transcriptSegments.length) return;
    const t = setTimeout(() => {
      setVisibleCount((c) => Math.min(c + 1, transcriptSegments.length));
    }, 2400);
    return () => clearTimeout(t);
  }, [visibleCount, isPlaying]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [visibleCount]);

  const restart = () => {
    setVisibleCount(1);
    setIsPlaying(true);
  };

  const isFinished = visibleCount >= transcriptSegments.length;
  const visible = transcriptSegments.slice(0, visibleCount);
  const langLabel =
    languages.find((l) => l.code === preferredLanguage)?.label ?? 'English';

  return (
    <>
      <div className="live-topbar">
        <span className={`live-indicator ${!isPlaying || isFinished ? 'paused' : ''}`}>
          {isFinished ? 'Ended' : isPlaying ? 'Live' : 'Paused'}
        </span>
        <LanguageSelect
          value={preferredLanguage}
          onChange={setPreferredLanguage}
          label="Translate to"
        />
      </div>

      <div className="transcript-stream">
        {visible.map((segment) => (
          <DemoSegment
            key={segment.id}
            segment={segment}
            preferredLanguage={preferredLanguage}
            preferredLangLabel={langLabel}
          />
        ))}
        <div ref={bottomRef} />
      </div>

      <div className="transcript-controls">
        {!isFinished && (
          <button className="btn btn-ghost" onClick={() => setIsPlaying((p) => !p)}>
            {isPlaying ? 'Pause' : 'Resume'}
          </button>
        )}
        <button className="btn btn-ghost" onClick={restart}>Restart</button>
        {!isFinished && (
          <button
            className="btn btn-link"
            onClick={() => setVisibleCount(transcriptSegments.length)}
          >
            Skip to end
          </button>
        )}
      </div>
    </>
  );
}

function DemoSegment({ segment, preferredLanguage, preferredLangLabel }) {
  const translation =
    segment.translations[preferredLanguage] ?? segment.translations.en;

  if (segment.isArabic) {
    return (
      <article className="segment is-arabic">
        <div className="segment-time">{segment.timestamp} · Arabic</div>
        <div className="segment-original">{segment.originalText}</div>
        {preferredLanguage !== 'ar' && (
          <div className="segment-translation">
            <div className="segment-translation-label">
              {preferredLangLabel} translation
            </div>
            {translation}
          </div>
        )}
      </article>
    );
  }

  const showOriginalRef =
    preferredLanguage !== 'en' && translation !== segment.originalText;

  return (
    <article className="segment">
      <div className="segment-time">{segment.timestamp} · Spoken</div>
      <div className="segment-original">{translation}</div>
      {showOriginalRef && (
        <div className="segment-translation">
          <div className="segment-translation-label">Original (English)</div>
          {segment.originalText}
        </div>
      )}
    </article>
  );
}

function LiveMicMode({ preferredLanguage, setPreferredLanguage }) {
  const useWhisper = useMemo(() => isWhisperConfigured(), []);
  const canSummarize = useMemo(() => isSummarizerConfigured(), []);

  const { addKhutbah } = useApp();
  const navigate = useNavigate();

  const [status, setStatus] = useState('idle');
  const [segments, setSegments] = useState([]);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');

  const recognizerRef = useRef(null);
  const bottomRef = useRef(null);
  const startedAtRef = useRef(null);

  const isListening = status === 'listening';
  const isStarting = status === 'starting';

  const formatElapsed = () => {
    if (!startedAtRef.current) return '00:00';
    const s = Math.floor((Date.now() - startedAtRef.current) / 1000);
    const mm = String(Math.floor(s / 60)).padStart(2, '0');
    const ss = String(s % 60).padStart(2, '0');
    return `${mm}:${ss}`;
  };

  const commitFinal = (text) => {
    const clean = text.trim();
    if (!clean) return;

    const id = `s-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    const segmentIsArabic = isPredominantlyArabic(clean);
    const fromLang = segmentIsArabic ? 'ar' : 'en';
    const needsTranslation = fromLang !== preferredLanguage;

    const segment = {
      id,
      timestamp: formatElapsed(),
      isArabic: segmentIsArabic,
      originalText: clean,
      translatedText: '',
      translating: needsTranslation,
    };

    setSegments((prev) => [...prev, segment]);

    if (segmentIsArabic) {
      searchQuran(clean)
        .then((match) => {
          if (!match) return;
          setSegments((prev) =>
            prev.map((s) =>
              s.id === id
                ? {
                    ...s,
                    originalText: match.arabic,
                    quranMatch: match,
                    translatedText:
                      preferredLanguage === 'en' && match.translation
                        ? match.translation
                        : s.translatedText,
                    translating:
                      preferredLanguage === 'en' && match.translation
                        ? false
                        : s.translating,
                  }
                : s,
            ),
          );
        })
        .catch(() => {});
    }

    if (!needsTranslation) return;

    translate(clean, { from: fromLang, to: preferredLanguage })
      .then((translated) => {
        setSegments((prev) =>
          prev.map((s) =>
            s.id === id
              ? {
                  ...s,
                  translatedText: s.quranMatch?.translation
                    ? s.translatedText
                    : translated,
                  translating: false,
                }
              : s,
          ),
        );
      })
      .catch(() => {
        setSegments((prev) =>
          prev.map((s) =>
            s.id === id
              ? { ...s, translatedText: '(translation failed)', translating: false }
              : s,
          ),
        );
      });
  };

  const start = async () => {
    setError('');

    if (typeof window !== 'undefined' && !window.isSecureContext) {
      setError('Live mic needs a secure context. Open the app via http://localhost or HTTPS.');
      return;
    }

    if (!useWhisper) {
      setError('Whisper is not configured. Set VITE_GROQ_API_KEY in .env and restart the dev server.');
      return;
    }

    if (recognizerRef.current?.running) return;

    setStatus('starting');
    recognizerRef.current?.abort?.();

    const rec = createWhisperRecognizer({
      onStart: () => {
        startedAtRef.current = Date.now();
        setStatus('listening');
      },
      onResult: ({ final }) => {
        if (final) commitFinal(final);
      },
      onError: (err, { fatal } = {}) => {
        if (err === 'not-allowed') {
          setError('Microphone permission was blocked. Allow mic access and try again.');
        } else if (err === 'whisper-http-401' || err === 'whisper-http-403') {
          setError('Whisper rejected the API key. Check VITE_GROQ_API_KEY in .env and restart the dev server.');
        } else if (fatal) {
          setError(`Transcription error: ${err}`);
        }
      },
      onEnd: () => setStatus('idle'),
    });

    if (!rec) {
      setError('Could not initialize Whisper recognizer.');
      setStatus('idle');
      return;
    }

    recognizerRef.current = rec;
    rec.start();
  };

  const stop = () => {
    recognizerRef.current?.stop();
    setStatus('idle');
  };

  const clear = () => {
    setSegments([]);
    startedAtRef.current = Date.now();
    setSaveError('');
  };

  const saveAsKhutbah = async () => {
    if (segments.length === 0 || saving) return;
    setSaveError('');
    setSaving(true);

    try {
      const summary = await summarizeTranscript(segments);

      const seenQuranRefs = new Set();
      const quranRefs = [];
      for (const s of segments) {
        const m = s.quranMatch;
        if (!m?.reference) continue;
        if (seenQuranRefs.has(m.reference)) continue;
        seenQuranRefs.add(m.reference);
        quranRefs.push({
          type: 'ayah',
          label: `Qur'an — ${m.reference}`,
          arabic: m.arabic || s.originalText,
          translation: m.translation || s.translatedText || '',
        });
      }
      const llmRefs = (summary.references || []).filter((r) => {
        if (r?.type !== 'quran') return true;
        const cite = String(r.citation || '').toLowerCase();
        for (const ref of seenQuranRefs) {
          if (cite.includes(ref.toLowerCase())) return false;
        }
        return true;
      });
      const mergedRefs = [...quranRefs, ...llmRefs];

      const khutbah = {
        id: `k-${Date.now()}`,
        title: summary.title,
        date: new Date().toISOString().slice(0, 10),
        topic: summary.topic,
        summary: summary.summary,
        mainTheme: summary.mainTheme,
        keyPoints: summary.keyPoints,
        references: mergedRefs,
        takeaways: summary.takeaways,
        tags: summary.tags,
        transcript: segments.map((s) => ({
          isArabic: s.isArabic,
          originalText: s.originalText,
          translatedText: s.translatedText,
          timestamp: s.timestamp,
          quranMatch: s.quranMatch || null,
        })),
        capturedLive: true,
      };

      addKhutbah(khutbah);
      navigate(`/khutbah/${khutbah.id}`);
    } catch (err) {
      setSaveError(
        `Couldn't generate the summary: ${err.message || err}. You can still keep the transcript on screen.`,
      );
    } finally {
      setSaving(false);
    }
  };

  useEffect(() => {
    return () => {
      const r = recognizerRef.current;
      if (r) {
        setTimeout(() => {
          if (recognizerRef.current === r) r.stop();
        }, 0);
      }
    };
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [segments.length]);

  return (
    <>
      <div className="live-topbar">
        <span className={`live-indicator ${!isListening ? 'paused' : ''}`}>
          {isListening ? 'Listening' : isStarting ? 'Starting…' : 'Idle'}
        </span>
        <LanguageSelect
          value={preferredLanguage}
          onChange={setPreferredLanguage}
          label="Translate to"
        />
      </div>

      {!useWhisper && (
        <div className="banner banner-warn">
          Whisper is not configured. Add <code>VITE_GROQ_API_KEY</code> to
          your <code>.env</code> and restart the dev server.
        </div>
      )}

      {error && <div className="banner banner-error">{error}</div>}
      {saveError && <div className="banner banner-error">{saveError}</div>}

      <div className="mic-controls">
        {!isListening ? (
          <button
            type="button"
            className="btn btn-primary mic-btn"
            onClick={start}
            disabled={!useWhisper || isStarting}
          >
            <MicIcon /> {isStarting ? 'Starting…' : 'Start listening'}
          </button>
        ) : (
          <button type="button" className="btn btn-danger mic-btn" onClick={stop}>
            <StopIcon /> Stop
          </button>
        )}

        {segments.length > 0 && !isListening && !isStarting && canSummarize && (
          <button
            type="button"
            className="btn btn-primary"
            onClick={saveAsKhutbah}
            disabled={saving}
          >
            {saving ? 'Generating summary…' : 'Save as Khutbah'}
          </button>
        )}

        {segments.length > 0 && (
          <button
            type="button"
            className="btn btn-ghost"
            onClick={clear}
            disabled={isListening || isStarting || saving}
          >
            Clear
          </button>
        )}

        <p className="mic-hint">
          Speak naturally — Whisper handles English/Arabic code-switching, and
          Quran verses get matched automatically.
        </p>
      </div>

      <div className="transcript-stream">
        {segments.length === 0 && (
          <div className="empty-state" style={{ margin: 0 }}>
            {isListening
              ? 'Listening… speak or play the khutbah audio near the mic. First transcript appears in a few seconds.'
              : isStarting
                ? 'Waiting for microphone permission…'
                : 'Tap Start listening to begin a live session.'}
          </div>
        )}

        {segments.map((s) => (
          <LiveSegment key={s.id} segment={s} preferredLanguage={preferredLanguage} />
        ))}

        <div ref={bottomRef} />
      </div>
    </>
  );
}

function LiveSegment({ segment, preferredLanguage }) {
  const langLabel =
    languages.find((l) => l.code === preferredLanguage)?.label ?? 'Translation';

  if (segment.isArabic) {
    const q = segment.quranMatch;
    return (
      <article className={`segment is-arabic ${q ? 'is-quran' : ''}`}>
        <div className="segment-time">
          {segment.timestamp} · {q ? `Quran · ${q.reference}` : 'Arabic'}
        </div>
        <div className="segment-original">{segment.originalText}</div>
        {preferredLanguage !== 'ar' && (
          <div className="segment-translation">
            <div className="segment-translation-label">
              {q ? `${langLabel} (Asad translation)` : `${langLabel} translation`}
            </div>
            {segment.translating ? (
              <em style={{ color: '#7a8178' }}>translating…</em>
            ) : (
              segment.translatedText || segment.originalText
            )}
          </div>
        )}
      </article>
    );
  }

  const primary = segment.translatedText || segment.originalText;
  const showOriginal =
    segment.translatedText && segment.translatedText !== segment.originalText;

  return (
    <article className="segment">
      <div className="segment-time">{segment.timestamp} · Spoken</div>
      <div className="segment-original">
        {segment.translating ? (
          <em style={{ color: '#7a8178' }}>translating…</em>
        ) : (
          primary
        )}
      </div>
      {showOriginal && (
        <div className="segment-translation">
          <div className="segment-translation-label">Original</div>
          {segment.originalText}
        </div>
      )}
    </article>
  );
}

function MicIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
      <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
      <line x1="12" y1="19" x2="12" y2="23" />
      <line x1="8" y1="23" x2="16" y2="23" />
    </svg>
  );
}

function StopIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
      <rect x="6" y="6" width="12" height="12" rx="2" />
    </svg>
  );
}
