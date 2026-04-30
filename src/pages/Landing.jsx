import { Link } from 'react-router-dom';

export default function Landing() {
  return (
    <div className="landing">
      <div className="landing-inner">
        <h1 className="landing-title">Ilm</h1>
        <p className="landing-tagline">Understand the Khutbah. Revisit the Message.</p>
        <p className="landing-sub">
          A web app to help Muslims save, review, and understand Jumu'ah khutbahs.
        </p>
        <Link to="/home" className="btn btn-primary">Get Started</Link>
      </div>
    </div>
  );
}
