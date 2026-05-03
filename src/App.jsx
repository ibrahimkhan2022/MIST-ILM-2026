import { Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout.jsx';
import Home from './pages/Home.jsx';
import Library from './pages/Library.jsx';
import KhutbahDetail from './pages/KhutbahDetail.jsx';
import Chatbot from './pages/Chatbot.jsx';
import LiveTranscript from './pages/LiveTranscript.jsx';

export default function App() {
  return (
    <Layout>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/home" element={<Navigate to="/" replace />} />
        <Route path="/library" element={<Library />} />
        <Route path="/khutbah/:id" element={<KhutbahDetail />} />
        <Route path="/chat" element={<Chatbot />} />
        <Route path="/transcript" element={<LiveTranscript />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Layout>
  );
}
