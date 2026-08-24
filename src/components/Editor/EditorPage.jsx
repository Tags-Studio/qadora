import Canvas3D from './Canvas3D';
import ControlPanel from './ControlPanel';

export default function EditorPage() {
  return (
    <>
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
    </>
  );
}
