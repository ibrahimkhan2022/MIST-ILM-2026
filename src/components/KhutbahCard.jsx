import { Link } from 'react-router-dom';

export default function KhutbahCard({ khutbah }) {
  return (
    <Link to={`/khutbah/${khutbah.id}`} className="khutbah-card">
      <div className="khutbah-card-meta">
        <span className="khutbah-card-date">{khutbah.date}</span>
        <span className="khutbah-card-speaker">{khutbah.speaker}</span>
      </div>
      <h3 className="khutbah-card-title">{khutbah.title}</h3>
      <p className="khutbah-card-summary">{khutbah.summary}</p>
      <div className="khutbah-card-tags">
        {khutbah.tags.map((t) => (
          <span key={t} className="khutbah-tag">{t}</span>
        ))}
      </div>
    </Link>
  );
}
