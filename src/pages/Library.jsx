import { useMemo, useState } from 'react';
import { useApp } from '../context/AppContext.jsx';
import KhutbahCard from '../components/KhutbahCard.jsx';
import SearchBar from '../components/SearchBar.jsx';

export default function Library() {
  const { khutbahs } = useApp();
  const [query, setQuery] = useState('');

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return khutbahs;
    return khutbahs.filter((k) =>
      [k.title, k.speaker, k.summary, ...k.tags].join(' ').toLowerCase().includes(q),
    );
  }, [khutbahs, query]);

  return (
    <div className="page">
      <h2 className="page-title">Khutbah Library</h2>
      <p className="page-sub">All khutbahs saved in your community feed.</p>
      <SearchBar value={query} onChange={setQuery} />
      <div className="card-grid" style={{ marginTop: '1.5rem' }}>
        {filtered.length === 0 ? (
          <p className="page-sub">No khutbahs match "{query}".</p>
        ) : (
          filtered.map((k) => <KhutbahCard key={k.id} khutbah={k} />)
        )}
      </div>
    </div>
  );
}
