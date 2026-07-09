import { useState } from 'react';
import HomePage from './components/HomePage';
import DielinePage from './components/DielinePage';
import DielineDetailPage from './components/DielineDetailPage';
import Canvas3D from './components/Editor/Canvas3D';
import ControlPanel from './components/Editor/ControlPanel';
import './App.css';

export default function App() {
  const [currentView, setCurrentView] = useState('dieline');
  const [selectedDieline, setSelectedDieline] = useState(null);

  const handleNavigate = (sectionId) => {
    setCurrentView(sectionId);
  };

  const handleBackHome = () => {
    setCurrentView('dieline');
    setSelectedDieline(null);
  };

  const handleSelectDieline = (dieline) => {
    setSelectedDieline(dieline);
    setCurrentView('dieline-detail');
  };

  const handleBackToDielinesList = () => {
    setCurrentView('dieline');
    setSelectedDieline(null);
  };

  // 1. Home View
  if (currentView === 'home') {
    return (
      <div className="app-layout home-view">
        <HomePage onNavigate={handleNavigate} />
      </div>
    );
  }

  // 2. Dieline List View
  if (currentView === 'dieline') {
    return (
      <div className="app-layout dieline-view-clean">
        <DielinePage onBack={handleBackHome} onSelectDieline={handleSelectDieline} />
      </div>
    );
  }

  // 3. Dieline Detail View
  if (currentView === 'dieline-detail' && selectedDieline) {
    return (
      <div className="app-layout dieline-detail-view">
        <DielineDetailPage dieline={selectedDieline} onBack={handleBackToDielinesList} onSelectDieline={handleSelectDieline} />
      </div>
    );
  }

  // 4. Editor View (Mockup & 3D Modeling)
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
