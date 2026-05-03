import { useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useApp } from '../context/AppContext.jsx';

function formatDate(iso) {
  try {
    return new Date(iso).toLocaleDateString(undefined, {
      month: 'long',
      day: 'numeric',
      year: 'numeric'
    });
  } catch {
    return iso;
  }
}

export default function KhutbahDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { getKhutbah, setActiveKhutbahId, deleteKhutbah } = useApp();
  const khutbah = getKhutbah(id);

  const handleDelete = () => {
    if (!khutbah) return;
    if (window.confirm(`Delete "${khutbah.title}"? This cannot be undone.`)) {
      deleteKhutbah(khutbah.id);
      navigate('/library');
    }
  };

  useEffect(() => {
    if (khutbah) setActiveKhutbahId(khutbah.id);
  }, [khutbah, setActiveKhutbahId]);

  if (!khutbah) {
    return (
      <div className="page page-narrow">
        <div className="empty-state">
          That khutbah couldn't be found.{' '}
          <button
            className="btn-link"
            onClick={() => navigate('/library')}
            style={{ border: 'none', background: 'none', color: '#1f5d50', cursor: 'pointer', padding: 0, font: 'inherit' }}
          >
            Back to library
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="page page-narrow">
      <button className="btn btn-link" onClick={() => navigate(-1)} style={{ marginBottom: '1rem' }}>
        ← Back
      </button>

      <header className="detail-header">
        <div className="detail-meta">
          <span className="tag">{formatDate(khutbah.date)}</span>
          {khutbah.topic && <span className="tag tag-gold">{khutbah.topic}</span>}
          {khutbah.capturedLive && <span className="tag tag-gold">Captured live</span>}
        </div>
        <h1>{khutbah.title}</h1>
        {khutbah.summary && (
          <p style={{ color: '#445049', marginTop: '0.8rem' }}>{khutbah.summary}</p>
        )}
      </header>

      {khutbah.mainTheme && (
        <section className="detail-section">
          <h3>Main Theme</h3>
          <p style={{ color: '#445049' }}>{khutbah.mainTheme}</p>
        </section>
      )}

      {khutbah.keyPoints?.length > 0 && (
        <section className="detail-section">
          <h3>Key Points</h3>
          <ul className="detail-list">
            {khutbah.keyPoints.map((p, i) => (
              <li key={i}>{p}</li>
            ))}
          </ul>
        </section>
      )}

      {khutbah.references?.length > 0 && (
        <section className="detail-section">
          <h3>Evidence</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
            {khutbah.references.map((r, i) => {
              const heading =
                r.label || r.citation ||
                (r.type ? r.type[0].toUpperCase() + r.type.slice(1) : 'Reference');
              const body = r.translation || r.note || '';
              return (
                <div key={i} className="reference-item">
                  <strong>{heading}</strong>
                  {r.arabic && <div className="arabic-block">{r.arabic}</div>}
                  {body && <p>{body}</p>}
                </div>
              );
            })}
          </div>
        </section>
      )}

      {khutbah.takeaways?.length > 0 && (
        <section className="detail-section">
          <h3>Practical Lessons</h3>
          <ul className="detail-list">
            {khutbah.takeaways.map((t, i) => (
              <li key={i}>{t}</li>
            ))}
          </ul>
        </section>
      )}

      {khutbah.transcript?.length > 0 && (
        <section className="detail-section">
          <h3>Transcript</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
            {khutbah.transcript.map((seg, i) => (
              <div key={i} className={`transcript-line ${seg.isArabic ? 'is-arabic' : ''}`}>
                {seg.timestamp && <span className="transcript-ts">{seg.timestamp}</span>}
                <div className="transcript-body">
                  {seg.quranMatch?.reference && (
                    <div className="tag tag-gold" style={{ marginBottom: '0.3rem' }}>
                      {seg.quranMatch.reference}
                    </div>
                  )}
                  <div className={seg.isArabic ? 'arabic-block' : ''}>{seg.originalText}</div>
                  {seg.translatedText && seg.translatedText !== seg.originalText && (
                    <div style={{ color: '#445049', marginTop: '0.2rem' }}>{seg.translatedText}</div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {khutbah.tags?.length > 0 && (
        <section className="detail-section">
          <h3>Tags</h3>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
            {khutbah.tags.map((t) => (
              <span className="tag" key={t}>#{t}</span>
            ))}
          </div>
        </section>
      )}

      <div className="detail-actions">
        <button className="btn btn-primary" onClick={() => navigate('/chat')}>
          Ask AI about this khutbah
        </button>
        <button className="btn btn-ghost" onClick={() => navigate('/library')}>
          Back to library
        </button>
        <button className="btn btn-danger" onClick={handleDelete} style={{ marginLeft: 'auto' }}>
          Delete
        </button>
      </div>
    </div>
  );
}
