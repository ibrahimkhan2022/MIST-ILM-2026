import { Link, useParams } from 'react-router-dom';
import { useApp } from '../context/AppContext.jsx';

export default function KhutbahDetail() {
  const { id } = useParams();
  const { khutbahs } = useApp();
  const k = khutbahs.find((x) => x.id === id);

  if (!k) {
    return (
      <div className="page">
        <h2 className="page-title">Khutbah not found</h2>
        <Link to="/library" className="link-accent">← Back to library</Link>
      </div>
    );
  }

  return (
    <div className="page page-narrow">
      <Link to="/library" className="link-accent">← Back to library</Link>
      <h1 className="detail-title">{k.title}</h1>
      <div className="detail-meta">
        <span>{k.speaker}</span>
        <span>·</span>
        <span>{k.date}</span>
        <span>·</span>
        <span>{k.masjid}</span>
      </div>
      <div className="khutbah-card-tags" style={{ marginBottom: '1.5rem' }}>
        {k.tags.map((t) => (
          <span key={t} className="khutbah-tag">{t}</span>
        ))}
      </div>
      <p className="detail-summary">{k.summary}</p>
      <div className="detail-body">{k.body}</div>
    </div>
  );
}
