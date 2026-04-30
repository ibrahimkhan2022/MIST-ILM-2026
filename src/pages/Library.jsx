import { khutbahs } from '../data/khutbahs.js';
import KhutbahCard from '../components/KhutbahCard.jsx';

export default function Library() {
  return (
    <div className="page">
      <h2 className="page-title">Khutbah Library</h2>
      <p className="page-sub">All khutbahs saved in your community feed.</p>
      <div className="card-grid">
        {khutbahs.map((k) => (
          <KhutbahCard key={k.id} khutbah={k} />
        ))}
      </div>
    </div>
  );
}
