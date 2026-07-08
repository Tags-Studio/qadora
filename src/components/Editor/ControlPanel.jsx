import { useEditorStore } from '../../store/useEditorStore';
import { downloadDieline } from './DielineGenerator';

const COLORS = [
  { hex: '#ff6b35', name: 'برتقالي' },
  { hex: '#e63946', name: 'أحمر' },
  { hex: '#06d6a0', name: 'أخضر مياه' },
  { hex: '#118ab2', name: 'أزرق' },
  { hex: '#f7c59f', name: 'خوخي' },
  { hex: '#7b2d8b', name: 'بنفسجي' },
  { hex: '#f5ede0', name: 'كريمي' },
  { hex: '#15110d', name: 'أسود' },
  { hex: '#c9a227', name: 'ذهبي' },
  { hex: '#adb5bd', name: 'فضي' },
  { hex: '#2d6a4f', name: 'أخضر غامق' },
  { hex: '#e9c46a', name: 'أصفر' },
];

const SHAPES = [
  { id: 'box', label: 'صندوق', emoji: '📦' },
  { id: 'cylinder', label: 'أسطوانة', emoji: '🥫' },
  { id: 'bag', label: 'كيس مسطح', emoji: '🛍️' },
];

export default function ControlPanel() {
  const store = useEditorStore();

  const handleFileUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => store.setTextureUrl(ev.target.result);
    reader.readAsDataURL(file);
  };

  const handleReset = () => {
    if (window.confirm('هل تريد إعادة ضبط المشروع بالكامل؟')) {
      store.resetProject();
      localStorage.removeItem('packwave-editor-storage');
    }
  };

  return (
    <aside className="control-panel">
      {/* ───────── رأس اللوحة ───────── */}
      <div className="panel-header">
        <div className="logo-mark">
          <span className="logo-icon">⬡</span>
          <span className="logo-text">Packwave</span>
        </div>
        <span className="panel-badge">Editor v1</span>
      </div>

      <div className="panel-scroll">
        {/* ───────── 1. نوع العبوة ───────── */}
        <section className="panel-section">
          <h3 className="section-title">نوع العبوة</h3>
          <div className="shape-grid">
            {SHAPES.map((s) => (
              <button
                key={s.id}
                onClick={() => store.setShape(s.id)}
                className={`shape-btn ${store.shape === s.id ? 'active' : ''}`}
                title={s.label}
              >
                <span className="shape-emoji">{s.emoji}</span>
                <span className="shape-label">{s.label}</span>
              </button>
            ))}
          </div>
        </section>

        {/* ───────── 2. اللون ───────── */}
        <section className="panel-section">
          <h3 className="section-title">لون العبوة</h3>
          <div className="color-grid">
            {COLORS.map((c) => (
              <button
                key={c.hex}
                onClick={() => store.setColor(c.hex)}
                className={`color-swatch ${store.color === c.hex ? 'active' : ''}`}
                style={{ backgroundColor: c.hex }}
                title={c.name}
              />
            ))}
          </div>
          {/* منتقي لون مخصص */}
          <div className="custom-color-row">
            <label className="custom-color-label">لون مخصص:</label>
            <input
              type="color"
              value={store.color}
              onChange={(e) => store.setColor(e.target.value)}
              className="color-picker-input"
            />
            <span className="color-hex-value">{store.color}</span>
          </div>
        </section>

        {/* ───────── 3. الخامة ───────── */}
        <section className="panel-section">
          <h3 className="section-title">الخامة (Material)</h3>
          <div className="slider-group">
            <div className="slider-row">
              <label>الخشونة</label>
              <span className="slider-value">{store.roughness.toFixed(2)}</span>
            </div>
            <input
              type="range" min="0" max="1" step="0.01"
              value={store.roughness}
              onChange={(e) => store.setRoughness(parseFloat(e.target.value))}
              className="styled-range"
            />
            <div className="slider-hints"><span>ناعم</span><span>خشن</span></div>
          </div>
          <div className="slider-group">
            <div className="slider-row">
              <label>اللمعان (معدن)</label>
              <span className="slider-value">{store.metalness.toFixed(2)}</span>
            </div>
            <input
              type="range" min="0" max="1" step="0.01"
              value={store.metalness}
              onChange={(e) => store.setMetalness(parseFloat(e.target.value))}
              className="styled-range"
            />
            <div className="slider-hints"><span>مط</span><span>معدني</span></div>
          </div>
        </section>

        {/* ───────── 4. الشعار (Decal) ───────── */}
        <section className="panel-section">
          <h3 className="section-title">الشعار (Decal)</h3>
          <input
            type="file"
            accept="image/*"
            onChange={handleFileUpload}
            className="hidden-file-input"
            id="logo-upload"
          />
          <label htmlFor="logo-upload" className="upload-btn">
            {store.textureUrl ? (
              <>
                <span>🔄</span> تغيير الشعار
              </>
            ) : (
              <>
                <span>⬆️</span> رفع شعار (PNG / SVG)
              </>
            )}
          </label>

          {store.textureUrl && (
            <div className="decal-controls">
              <div className="slider-group">
                <div className="slider-row">
                  <label>الحجم</label>
                  <span className="slider-value">{store.decalScale.toFixed(1)}×</span>
                </div>
                <input type="range" min="0.2" max="3" step="0.05"
                  value={store.decalScale}
                  onChange={(e) => store.setDecalScale(parseFloat(e.target.value))}
                  className="styled-range" />
              </div>
              <div className="slider-group">
                <div className="slider-row">
                  <label>الموقع ← →</label>
                  <span className="slider-value">{store.decalPositionX.toFixed(2)}</span>
                </div>
                <input type="range" min="-1" max="1" step="0.02"
                  value={store.decalPositionX}
                  onChange={(e) => store.setDecalPositionX(parseFloat(e.target.value))}
                  className="styled-range" />
              </div>
              <div className="slider-group">
                <div className="slider-row">
                  <label>الموقع ↑ ↓</label>
                  <span className="slider-value">{store.decalPositionY.toFixed(2)}</span>
                </div>
                <input type="range" min="-1" max="1" step="0.02"
                  value={store.decalPositionY}
                  onChange={(e) => store.setDecalPositionY(parseFloat(e.target.value))}
                  className="styled-range" />
              </div>
              <button onClick={() => store.setTextureUrl(null)} className="remove-logo-btn">
                🗑️ حذف الشعار
              </button>
            </div>
          )}
        </section>

        {/* ───────── 5. بيئة المشهد ───────── */}
        <section className="panel-section">
          <h3 className="section-title">بيئة المشهد</h3>
          <div className="theme-row">
            <button
              onClick={() => store.setSceneTheme('dark')}
              className={`theme-btn ${store.sceneTheme === 'dark' ? 'active' : ''}`}
            >🌙 غامق</button>
            <button
              onClick={() => store.setSceneTheme('studio')}
              className={`theme-btn ${store.sceneTheme === 'studio' ? 'active' : ''}`}
            >☀️ استوديو</button>
          </div>
          <div className="toggle-row">
            <button onClick={store.toggleGrid} className={`toggle-btn ${store.showGrid ? 'on' : ''}`}>
              {store.showGrid ? '◈ إخفاء الشبكة' : '◈ إظهار الشبكة'}
            </button>
            <button onClick={store.toggleAutoRotate} className={`toggle-btn ${store.autoRotate ? 'on' : ''}`}>
              {store.autoRotate ? '⏸ إيقاف الدوران' : '▶ تشغيل الدوران'}
            </button>
          </div>
        </section>
      </div>

      {/* ───────── 6. التصدير (ثابت في الأسفل) ───────── */}
      <div className="export-section">
        <button
          onClick={store.triggerExport}
          disabled={store.isExporting}
          className="export-primary-btn"
        >
          {store.isExporting ? (
            <><span className="spinner" /> جاري التصدير...</>
          ) : (
            <>📸 تصدير صورة 3D (PNG)</>
          )}
        </button>
        <button
          onClick={() => downloadDieline(store.color)}
          className="export-secondary-btn"
        >
          ✂️ تحميل خطوط القطع (SVG)
        </button>
        <button onClick={handleReset} className="reset-btn">
          ↺ إعادة ضبط المشروع
        </button>
      </div>
    </aside>
  );
}
