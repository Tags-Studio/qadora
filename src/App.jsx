import { useState } from 'react';
import HomePage from './components/HomePage';
import DielinePage from './components/DielinePage';
import Canvas3D from './components/Editor/Canvas3D';
import ControlPanel from './components/Editor/ControlPanel';
import './App.css';

export default function App() {
  const [currentView, setCurrentView] = useState('home');

  const handleNavigate = (sectionId) => {
    setCurrentView(sectionId);
  };

  const handleBackHome = () => {
    setCurrentView('home');
  };

  // Home view
  if (currentView === 'home') {
    return (
      <div className="app-layout home-view">
        <HomePage onNavigate={handleNavigate} />
      </div>
    );
  }

  // Dieline view
  if (currentView === 'dieline') {
    return (
      <div className="app-layout dieline-view">
        <button className="back-home-btn" onClick={handleBackHome} title="Back to Home">
          ← Home
        </button>
        <DielinePage onBack={handleBackHome} />
      </div>
    );
  }

  // Editor view
  return (
    <div className="app-layout">
      {/* Back Home Button */}
      <button className="back-home-btn" onClick={handleBackHome} title="Back to Home">
        ← Home
      </button>

      {/* لوحة التحكم */}
      <ControlPanel />

      {/* منطقة المشهد الثلاثي الأبعاد */}
      <main className="viewport">
        <Canvas3D />

        {/* تلميح التحكم */}
        <div className="viewport-hint">
          <span>🖱️ اسحب للتدوير</span>
          <span className="hint-sep">·</span>
          <span>⚙️ عجلة الماوس للتقريب</span>
        </div>

        {/* شارة العلامة التجارية */}
        <div className="viewport-brand">
          <span className="brand-icon">⬡</span> Packwave
        </div>
      </main>
    </div>
  );
}
