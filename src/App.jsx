import Canvas3D from './components/Editor/Canvas3D';
import ControlPanel from './components/Editor/ControlPanel';
import './App.css';

export default function App() {
  return (
    <div className="app-layout">
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
