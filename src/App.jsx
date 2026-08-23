import { Routes, Route, useNavigate } from 'react-router-dom';
import HomePage from './components/HomePage';
import DielinePage from './components/DielinePage';
import DielineDetailPage from './components/DielineDetailPage';
import Canvas3D from './components/Editor/Canvas3D';
import ControlPanel from './components/Editor/ControlPanel';
import './App.css';

export default function App() {
  const navigate = useNavigate();


  return (
    <Routes>
      <Route path="/" element={
        <div className="app-layout home-view">
          <HomePage onNavigate={(path) => navigate(path === 'dieline' ? '/templates' : '/')} />
        </div>
      } />

      <Route path="/templates" element={
        <div className="app-layout dieline-view-clean">
          <DielinePage onBack={() => navigate('/')} />
        </div>
      } />

      <Route path="/studio/:id" element={
        <div className="app-layout dieline-detail-view">
          <DielineDetailPage onBack={() => navigate('/templates')} />
        </div>
      } />

      <Route path="/editor" element={
        <div className="app-layout">
          <button className="back-home-btn" onClick={() => navigate('/')} title="Back to Home">
            ← Home
          </button>
          <ControlPanel />
          <main className="viewport">
            <Canvas3D />
            <div className="viewport-hint">
              <span>🖱️ اسحب للتدوير</span>
              <span className="hint-sep">·</span>
              <span>⚙️ عجلة الماوس للتقريب</span>
            </div>
            <div className="viewport-brand">
              <span className="brand-icon">⬡</span> Packwave
            </div>
          </main>
        </div>
      } />
    </Routes>
  );
}
