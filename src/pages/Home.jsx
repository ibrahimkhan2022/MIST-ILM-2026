import { Link } from 'react-router-dom';
import { useApp } from '../context/AppContext.jsx';
import KhutbahCard from '../components/KhutbahCard.jsx';

export default function Home() {
  const { khutbahs } = useApp();
  const recent = khutbahs.slice(0, 3);
  return (
    <div className="page">
      <h2 className="page-title">Welcome back</h2>
      <p className="page-sub">Recent khutbahs from your community.</p>
      <div className="card-grid">
        {recent.map((k) => (
          <KhutbahCard key={k.id} khutbah={k} />
        ))}
      </div>
      <p style={{ marginTop: '2rem' }}>
        <Link to="/library" className="link-accent">Browse the full library →</Link>
      </p>
    </div>
  );
}
