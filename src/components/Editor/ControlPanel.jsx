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
  const shape = useEditorStore((s) => s.shape);
  const color = useEditorStore((s) => s.color);
  const roughness = useEditorStore((s) => s.roughness);
  const metalness = useEditorStore((s) => s.metalness);
  const textureUrl = useEditorStore((s) => s.textureUrl);
  const decalScale = useEditorStore((s) => s.decalScale);
  const decalPositionX = useEditorStore((s) => s.decalPositionX);
  const decalPositionY = useEditorStore((s) => s.decalPositionY);
  const showGrid = useEditorStore((s) => s.showGrid);
  const sceneTheme = useEditorStore((s) => s.sceneTheme);
  const isExporting = useEditorStore((s) => s.isExporting);
  const setShape = useEditorStore((s) => s.setShape);
  const setColor = useEditorStore((s) => s.setColor);
  const setRoughness = useEditorStore((s) => s.setRoughness);
  const setMetalness = useEditorStore((s) => s.setMetalness);
  const setTextureUrl = useEditorStore((s) => s.setTextureUrl);
  const setDecalScale = useEditorStore((s) => s.setDecalScale);
  const setDecalPositionX = useEditorStore((s) => s.setDecalPositionX);
  const setDecalPositionY = useEditorStore((s) => s.setDecalPositionY);
  const toggleGrid = useEditorStore((s) => s.toggleGrid);
  const toggleAutoRotate = useEditorStore((s) => s.toggleAutoRotate);
  const setSceneTheme = useEditorStore((s) => s.setSceneTheme);
  const triggerExport = useEditorStore((s) => s.triggerExport);
  const resetProject = useEditorStore((s) => s.resetProject);

  // Downscale the logo before persisting: localStorage quota is ~5MB and a
  // raw data URL of a big photo blows through it instantly.
  const handleFileUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const dataUrl = ev.target.result;
      // SVG can't be rasterized losslessly — accept as-is (text-based, small)
      if (file.type === 'image/svg+xml') {
        setTextureUrl(dataUrl);
        return;
      }
      const img = new Image();
      img.onload = () => {
        try {
          const MAX = 512;
          const scale = Math.min(1, MAX / Math.max(img.width, img.height));
          const canvas = document.createElement('canvas');
          canvas.width = Math.max(1, Math.round(img.width * scale));
          canvas.height = Math.max(1, Math.round(img.height * scale));
          canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);
          setTextureUrl(canvas.toDataURL('image/png'));
        } catch {
          setTextureUrl(dataUrl);
        }
      };
      img.onerror = () => setTextureUrl(dataUrl);
      img.src = dataUrl;
    };
    reader.readAsDataURL(file);
  };

  const handleReset = () => {
    if (window.confirm('هل تريد إعادة ضبط المشروع بالكامل؟')) {
      resetProject();
      try {
        localStorage.removeItem('packwave-editor-storage');
      } catch {
        /* storage unavailable — ignore */
      }
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
                onClick={() => setShape(s.id)}
                className={`shape-btn ${shape === s.id ? 'active' : ''}`}
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
                onClick={() => setColor(c.hex)}
                className={`color-swatch ${color === c.hex ? 'active' : ''}`}
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
              value={color}
              onChange={(e) => setColor(e.target.value)}
              className="color-picker-input"
            />
            <span className="color-hex-value">{color}</span>
          </div>
        </section>

        {/* ───────── 3. الخامة ───────── */}
        <section className="panel-section">
          <h3 className="section-title">الخامة (Material)</h3>
          <div className="slider-group">
            <div className="slider-row">
              <label>الخشونة</label>
              <span className="slider-value">{roughness.toFixed(2)}</span>
            </div>
            <input
              type="range" min="0" max="1" step="0.01"
              value={roughness}
              onChange={(e) => setRoughness(parseFloat(e.target.value))}
              className="styled-range"
            />
            <div className="slider-hints"><span>ناعم</span><span>خشن</span></div>
          </div>
          <div className="slider-group">
            <div className="slider-row">
              <label>اللمعان (معدن)</label>
              <span className="slider-value">{metalness.toFixed(2)}</span>
            </div>
            <input
              type="range" min="0" max="1" step="0.01"
              value={metalness}
              onChange={(e) => setMetalness(parseFloat(e.target.value))}
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
            {textureUrl ? (
              <>
                <span>🔄</span> تغيير الشعار
              </>
            ) : (
              <>
                <span>⬆️</span> رفع شعار (PNG / SVG)
              </>
            )}
          </label>

          {textureUrl && (
            <div className="decal-controls">
              <div className="slider-group">
                <div className="slider-row">
                  <label>الحجم</label>
                  <span className="slider-value">{decalScale.toFixed(1)}×</span>
                </div>
                <input type="range" min="0.2" max="3" step="0.05"
                  value={decalScale}
                  onChange={(e) => setDecalScale(parseFloat(e.target.value))}
                  className="styled-range" />
              </div>
              <div className="slider-group">
                <div className="slider-row">
                  <label>الموقع ← →</label>
                  <span className="slider-value">{decalPositionX.toFixed(2)}</span>
                </div>
                <input type="range" min="-1" max="1" step="0.02"
                  value={decalPositionX}
                  onChange={(e) => setDecalPositionX(parseFloat(e.target.value))}
                  className="styled-range" />
              </div>
              <div className="slider-group">
                <div className="slider-row">
                  <label>الموقع ↑ ↓</label>
                  <span className="slider-value">{decalPositionY.toFixed(2)}</span>
                </div>
                <input type="range" min="-1" max="1" step="0.02"
                  value={decalPositionY}
                  onChange={(e) => setDecalPositionY(parseFloat(e.target.value))}
                  className="styled-range" />
              </div>
              <button onClick={() => setTextureUrl(null)} className="remove-logo-btn">
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
              onClick={() => setSceneTheme('dark')}
              className={`theme-btn ${sceneTheme === 'dark' ? 'active' : ''}`}
            >🌙 غامق</button>
            <button
              onClick={() => setSceneTheme('studio')}
              className={`theme-btn ${sceneTheme === 'studio' ? 'active' : ''}`}
            >☀️ استوديو</button>
          </div>
          <div className="toggle-row">
            <button onClick={toggleGrid} className={`toggle-btn ${showGrid ? 'on' : ''}`}>
              {showGrid ? '◈ إخفاء الشبكة' : '◈ إظهار الشبكة'}
            </button>
            <button onClick={toggleAutoRotate} className={`toggle-btn ${autoRotate ? 'on' : ''}`}>
              {autoRotate ? '⏸ إيقاف الدوران' : '▶ تشغيل الدوران'}
            </button>
          </div>
        </section>
      </div>

      {/* ───────── 6. التصدير (ثابت في الأسفل) ───────── */}
      <div className="export-section">
        <button
          onClick={triggerExport}
          disabled={isExporting}
          className="export-primary-btn"
        >
          {isExporting ? (
            <><span className="spinner" /> جاري التصدير...</>
          ) : (
            <>📸 تصدير صورة 3D (PNG)</>
          )}
        </button>
        <button
          onClick={() => downloadDieline(color)}
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
