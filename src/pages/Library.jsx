import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext.jsx';
import KhutbahCard from '../components/KhutbahCard.jsx';
import SearchBar from '../components/SearchBar.jsx';

export default function Library() {
  const { khutbahs } = useApp();
  const [query, setQuery] = useState('');
  const navigate = useNavigate();

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return khutbahs;
    return khutbahs.filter((k) =>
      [k.title, k.topic, k.summary, ...(k.tags || [])]
        .join(' ')
        .toLowerCase()
        .includes(q)
    );
  }, [khutbahs, query]);

  const isEmpty = khutbahs.length === 0;

  return (
    <div className="page">
      <div
        className="page-header"
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '1rem',
        }}
      >
        <div>
          <h1>Khutbah Library</h1>
          <p>
            {isEmpty
              ? 'Khutbahs you capture will appear here.'
              : "Everything you've saved — searchable and ready to revisit."}
          </p>
        </div>
        <button className="btn btn-primary" onClick={() => navigate('/transcript')}>
          + Capture live
        </button>
      </div>

      {!isEmpty && (
        <SearchBar
          value={query}
          onChange={setQuery}
          placeholder="Search by title, topic, or tag…"
        />
      )}

      {isEmpty ? (
        <div className="empty-state">
          You haven't saved any khutbahs yet.{' '}
          <button
            className="btn-link"
            onClick={() => navigate('/transcript')}
            style={{
              border: 'none',
              background: 'none',
              color: '#1f5d50',
              cursor: 'pointer',
              padding: 0,
              font: 'inherit',
            }}
          >
            Capture your first one live
          </button>
          .
        </div>
      ) : filtered.length === 0 ? (
        <div className="empty-state">
          No khutbahs match that search. Try a different keyword.
        </div>
      ) : (
        <div className="card-grid">
          {filtered.map((k) => (
            <KhutbahCard key={k.id} khutbah={k} compact />
          ))}
        </div>
      )}
    </div>
  );
}
