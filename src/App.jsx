import { Routes, Route } from 'react-router-dom';
import Layout from './components/Layout.jsx';
import Landing from './pages/Landing.jsx';
import Home from './pages/Home.jsx';
import Library from './pages/Library.jsx';
import KhutbahDetail from './pages/KhutbahDetail.jsx';

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route element={<Layout />}>
        <Route path="/home" element={<Home />} />
        <Route path="/library" element={<Library />} />
        <Route path="/khutbah/:id" element={<KhutbahDetail />} />
      </Route>
    </Routes>
  );
}
