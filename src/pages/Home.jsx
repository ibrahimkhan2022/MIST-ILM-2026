import { useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext.jsx';
import KhutbahCard from '../components/KhutbahCard.jsx';

export default function Home() {
  const navigate = useNavigate();
  const { khutbahs, setActiveKhutbahId } = useApp();

  const latest = khutbahs[0];
  const recent = khutbahs.slice(1, 4);

  const openLatest = () => {
    setActiveKhutbahId(latest.id);
    navigate(`/khutbah/${latest.id}`);
  };

  return (
    <div className="page">
      <div className="welcome">
        <div className="welcome-eyebrow">Assalāmu ʿalaykum</div>
        <h1>{latest ? 'Welcome back.' : 'Welcome to Ilm.'}</h1>
        <p style={{ color: '#445049', marginTop: '0.25rem' }}>
          {latest
            ? 'Pick up where the khutbah left off.'
            : 'Capture your first Friday khutbah and let AI summarize it.'}
        </p>
      </div>

      {latest ? (
        <article className="latest-card">
          <div className="card-meta">
            <span>Latest khutbah</span>
            {latest.topic && <span>{latest.topic}</span>}
          </div>
          <h2>{latest.title}</h2>
          <p>{latest.summary}</p>
          <div style={{ display: 'flex', gap: '0.6rem', flexWrap: 'wrap' }}>
            <button className="btn btn-gold" onClick={openLatest}>
              Open full khutbah
            </button>
            <button
              className="btn btn-ghost"
              style={{ color: '#fff', borderColor: 'rgba(255,255,255,0.3)' }}
              onClick={() => {
                setActiveKhutbahId(latest.id);
                navigate('/chat');
              }}
            >
              Ask AI about it
            </button>
          </div>
        </article>
      ) : (
        <article className="latest-card">
          <div className="card-meta">
            <span>Get started</span>
          </div>
          <h2>Your library is empty.</h2>
          <p>
            Open the live transcription page during the next Friday khutbah —
            Ilm will transcribe it, match Quran verses to canonical text, and
            generate a structured summary you can revisit anytime.
          </p>
          <div style={{ display: 'flex', gap: '0.6rem', flexWrap: 'wrap' }}>
            <button className="btn btn-gold" onClick={() => navigate('/transcript')}>
              Capture a khutbah
            </button>
          </div>
        </article>
      )}

      <div className="quick-actions">
        <button
          className="quick-action"
          onClick={() => navigate('/chat')}
          disabled={!latest}
          style={!latest ? { opacity: 0.5, cursor: 'not-allowed' } : undefined}
        >
          <div className="quick-action-icon">◎</div>
          <div>
            <div className="quick-action-title">Ask the AI</div>
            <div className="quick-action-sub">
              {latest
                ? 'Questions about any saved khutbah'
                : 'Available once you save your first khutbah'}
            </div>
          </div>
        </button>
        <button className="quick-action" onClick={() => navigate('/transcript')}>
          <div className="quick-action-icon">◌</div>
          <div>
            <div className="quick-action-title">Live translation</div>
            <div className="quick-action-sub">Follow the khutbah in your language</div>
          </div>
        </button>
      </div>

      {recent.length > 0 && (
        <>
          <div className="section-header">
            <h2>Recent khutbahs</h2>
            <button className="btn btn-link" onClick={() => navigate('/library')}>
              View all →
            </button>
          </div>
          <div className="card-grid">
            {recent.map((k) => (
              <KhutbahCard key={k.id} khutbah={k} compact />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
