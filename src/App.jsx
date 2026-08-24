import { lazy, Suspense, useEffect } from 'react';
import { Routes, Route, useNavigate, useLocation } from 'react-router-dom';
import ErrorBoundary from './components/ErrorBoundary';
import './App.css';

const HomePage = lazy(() => import('./components/HomePage'));
const DielinePage = lazy(() => import('./components/DielinePage'));
const DielineDetailPage = lazy(() => import('./components/DielineDetailPage'));
const EditorPage = lazy(() => import('./components/Editor/EditorPage'));

const ROUTE_TITLES = {
  '/': 'Packwave — 3D Packaging Editor',
  '/templates': 'Dieline Templates — Packwave',
  '/editor': '3D Editor — Packwave',
};

export default function App() {
  const navigate = useNavigate();
  const location = useLocation();

  // Per-route document titles
  useEffect(() => {
    if (location.pathname.startsWith('/studio')) {
      document.title = 'Dieline Studio — Packwave';
    } else {
      document.title = ROUTE_TITLES[location.pathname] || 'Packwave';
    }
  }, [location.pathname]);

  return (
    <ErrorBoundary>
      <Suspense fallback={<div className="route-loading">⬡ Loading…</div>}>
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
            <div className="app-layout editor-view">
              <button className="back-home-btn" onClick={() => navigate('/')} title="Back to Home">
                ← Home
              </button>
              <EditorPage />
            </div>
          } />
        </Routes>
      </Suspense>
    </ErrorBoundary>
  );
}
