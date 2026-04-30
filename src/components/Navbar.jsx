import { NavLink } from 'react-router-dom';
import LanguageSelect from './LanguageSelect.jsx';

export default function Navbar() {
  return (
    <nav className="navbar">
      <NavLink to="/" className="navbar-brand">Ilm</NavLink>
      <div className="navbar-links">
        <NavLink to="/home">Home</NavLink>
        <NavLink to="/library">Library</NavLink>
      </div>
      <LanguageSelect />
    </nav>
  );
}
