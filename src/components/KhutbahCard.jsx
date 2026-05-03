import { useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext.jsx';

function formatDate(iso) {
  try {
    return new Date(iso).toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  } catch {
    return iso;
  }
}

export default function KhutbahCard({ khutbah, compact = false }) {
  const navigate = useNavigate();
  const { deleteKhutbah } = useApp();
  const summary = khutbah.summary || '';

  const handleDelete = (e) => {
    e.stopPropagation();
    if (window.confirm(`Delete "${khutbah.title}"? This cannot be undone.`)) {
      deleteKhutbah(khutbah.id);
    }
  };

  return (
    <article
      className="card card-clickable"
      onClick={() => navigate(`/khutbah/${khutbah.id}`)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter') navigate(`/khutbah/${khutbah.id}`);
      }}
      style={{ position: 'relative' }}
    >
      <button
        type="button"
        className="card-delete"
        onClick={handleDelete}
        aria-label={`Delete ${khutbah.title}`}
        title="Delete khutbah"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="3 6 5 6 21 6" />
          <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
          <path d="M10 11v6" />
          <path d="M14 11v6" />
          <path d="M9 6V4a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2" />
        </svg>
      </button>
      <div className="card-meta">
        <span>{formatDate(khutbah.date)}</span>
        {khutbah.topic && <span>{khutbah.topic}</span>}
      </div>
      <h3 className="card-title">{khutbah.title}</h3>
      <p className="card-preview">
        {compact ? summary.slice(0, 110) + (summary.length > 110 ? '…' : '') : summary}
      </p>
    </article>
  );
}
