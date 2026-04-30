import { NavLink } from 'react-router-dom';

export default function Navbar() {
  return (
    <nav className="navbar">
      <NavLink to="/" className="navbar-brand">Ilm</NavLink>
      <div className="navbar-links">
        <NavLink to="/home">Home</NavLink>
      </div>
    </nav>
  );
}
