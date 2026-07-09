import React, { useState, useEffect, useRef, useMemo } from 'react';
import pacdoraDielines from '../data/pacdora_dielines.json';
import './DielineDetailPage.css';

// Upgrade pacdora CDN thumbnails (300px) to a higher-res variant for the detail view.
function hires(url, size = 1000) {
  if (!url) return url;
  return url.replace(/image-resize\/\d+xauto_outside/, `image-resize/${size}xauto_outside`);
}

const CATEGORY_LABELS = {
  tuckend: 'Tuck End Boxes',
  mailer: 'Mailer Boxes',
  gable: 'Gable & Handle',
  pillow: 'Pillow Boxes',
  sleeve: 'Sleeve Boxes',
  twopiece: 'Two-Piece Boxes',
  window: 'Window Cut',
  autolock: 'Auto Lock Bottom',
  tray: 'Trays & Displays',
  hexagonal: 'Polygonal Boxes',
  hanger: 'Hanger Boxes',
};

export default function DielineDetailPage({ dieline, onBack, onSelectDieline }) {
  // The dieline currently shown. Starts from the card the user clicked,
  // but can change when they pick a sibling in the sidebar.
  const [active, setActive] = useState(dieline);
  const [activeTab, setActiveTab] = useState('dieline'); // 'dieline' | 'preview'

  // Keep in sync if the parent passes a new dieline.
  useEffect(() => { setActive(dieline); }, [dieline?.id]);

  // Sibling dielines from the same category, for the navigation sidebar.
  const siblings = useMemo(
    () => pacdoraDielines.filter((d) => d.category === active.category),
    [active.category]
  );

  // Zoom / pan state for the 2D dieline image.
  const [scale, setScale] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const isPanning = useRef(false);
  const panStart = useRef({ x: 0, y: 0 });
  const stageRef = useRef(null);

  // Reset the view whenever the active dieline or tab changes.
  useEffect(() => {
    setScale(1);
    setPan({ x: 0, y: 0 });
  }, [active?.id, activeTab]);

  const handleWheel = (e) => {
    e.preventDefault();
    const factor = e.deltaY < 0 ? 1.12 : 1 / 1.12;
    const cx = e.nativeEvent.offsetX;
    const cy = e.nativeEvent.offsetY;
    setPan((prev) => ({
      x: cx - (cx - prev.x) * factor,
      y: cy - (cy - prev.y) * factor,
    }));
    setScale((prev) => Math.max(0.3, Math.min(6, prev * factor)));
  };
  const handleMouseDown = (e) => {
    isPanning.current = true;
    panStart.current = { x: e.clientX - pan.x, y: e.clientY - pan.y };
  };
  const handleMouseMove = (e) => {
    if (!isPanning.current) return;
    setPan({ x: e.clientX - panStart.current.x, y: e.clientY - panStart.current.y });
  };
  const handleMouseUp = () => { isPanning.current = false; };

  const resetView = () => { setScale(1); setPan({ x: 0, y: 0 }); };

  const selectDieline = (d) => {
    setActive(d);
    if (onSelectDieline) onSelectDieline(d);
  };

  const currentImg = activeTab === 'dieline' ? hires(active.dieline_image) : hires(active.image);

  return (
    <div className="dieline-studio-root">
      {/* Header */}
      <header className="ds-header">
        <div className="flex items-center gap-2.5">
          <button onClick={onBack} className="btn mr-2 px-3">
            <i className="fas fa-arrow-left"></i> Back
          </button>
          <div className="w-8 h-8 bg-accent rounded-lg flex items-center justify-center">
            <i className="fas fa-cube text-bg text-sm"></i>
          </div>
          <h1 className="text-base font-bold tracking-tight">Dieline Studio</h1>
          <span className="text-[11px] text-muted bg-card px-2 py-0.5 rounded">v3.0</span>
        </div>
        <div className="flex-1"></div>
        <div className="flex items-center gap-3">
          <span className="ds-cat-chip">
            <i className="fas fa-layer-group text-[10px]"></i>
            {CATEGORY_LABELS[active.category] || active.category}
          </span>
        </div>
      </header>

      <div className="flex h-[calc(100vh-56px)]">
        {/* Sidebar: sibling dielines in the same category */}
        <nav className="ds-sidebar">
          <div className="ds-sidebar-cat">
            {CATEGORY_LABELS[active.category] || active.category} · {siblings.length}
          </div>
          {siblings.map((d) => (
            <div
              key={d.id}
              className={`ds-thumb-item ${d.id === active.id ? 'active' : ''}`}
              onClick={() => selectDieline(d)}
              title={d.name}
            >
              <div className="ds-thumb-img">
                <img src={d.dieline_image} alt={d.name} loading="lazy" />
              </div>
              <span className="ds-thumb-name">{d.name}</span>
            </div>
          ))}
        </nav>

        {/* Main Area */}
        <div className="ds-main-area">
          {/* Tabs */}
          <div className="ds-tab-bar">
            <button
              className={`ds-tab-btn ${activeTab === 'dieline' ? 'active' : ''}`}
              onClick={() => setActiveTab('dieline')}
            >
              <i className="fas fa-drafting-compass mr-1.5"></i>2D Dieline
            </button>
            <button
              className={`ds-tab-btn ${activeTab === 'preview' ? 'active' : ''}`}
              onClick={() => setActiveTab('preview')}
            >
              <i className="fas fa-cube mr-1.5"></i>3D Preview
            </button>
          </div>

          {/* Viewport (image stage with zoom / pan) */}
          <div
            className={`ds-svg-container ${activeTab === 'preview' ? '!bg-[#0a0908]' : ''}`}
            ref={stageRef}
            onWheel={handleWheel}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
          >
            <div className="ds-svg-overlay">
              <button className="btn" onClick={() => setScale((s) => Math.min(6, s * 1.3))}>
                <i className="fas fa-plus"></i>
              </button>
              <button className="btn" onClick={() => setScale((s) => Math.max(0.3, s / 1.3))}>
                <i className="fas fa-minus"></i>
              </button>
              <button className="btn" onClick={resetView}>
                <i className="fas fa-expand"></i>
              </button>
            </div>

            <div className="ds-info-bar">
              {activeTab === 'dieline' ? (
                <>
                  <span><i className="fas fa-drafting-compass text-[10px]"></i> Dieline blueprint</span>
                  <span><i className="fas fa-mouse-pointer text-[10px]"></i> Drag to pan · Scroll to zoom</span>
                </>
              ) : (
                <span><i className="fas fa-cube text-[10px]"></i> 3D packaging preview</span>
              )}
            </div>

            <div className="ds-image-stage">
              <img
                key={currentImg}
                src={currentImg}
                alt={active.name}
                className="ds-stage-img"
                draggable="false"
                style={{
                  transform: `translate(${pan.x}px, ${pan.y}px) scale(${scale})`,
                }}
              />
            </div>
          </div>

          {/* Bottom Panel: metadata + preview + downloads */}
          <div className="ds-bottom-panel">
            <div className="ds-panel-3d">
              <img src={hires(active.image, 800)} alt={active.name} className="ds-mini-mockup" />
              <div className="absolute top-2 left-2 text-[10px] text-muted bg-[rgba(12,10,8,0.7)] px-2 py-1 rounded">
                <i className="fas fa-cube"></i> 3D Mockup
              </div>
            </div>

            <div className="ds-panel-controls">
              <div className="flex justify-between items-start mb-4 gap-3">
                <div>
                  <h3 className="text-[15px] font-bold leading-snug">{active.name}</h3>
                  <div className="text-xs text-muted mt-1">Template #{active.id}</div>
                </div>
                <div className="flex gap-1.5 shrink-0">
                  <button className="btn btn-primary" onClick={() => window.open(hires(active.dieline_image, 1600), '_blank')}>
                    <i className="fas fa-download"></i> 2D
                  </button>
                  <button className="btn" onClick={() => window.open(hires(active.image, 1600), '_blank')}>
                    <i className="fas fa-image"></i> 3D
                  </button>
                </div>
              </div>

              <div className="ds-ctrl-group">
                <div className="ds-ctrl-label">Specifications</div>
                <div className="grid grid-cols-2 gap-1.5 text-xs">
                  <div className="ds-spec-cell">
                    <div className="text-muted text-[10px]">Box Style</div>
                    <div className="font-semibold">{active.style || '—'}</div>
                  </div>
                  <div className="ds-spec-cell">
                    <div className="text-muted text-[10px]">Closure</div>
                    <div className="font-semibold">{active.closure || '—'}</div>
                  </div>
                  <div className="ds-spec-cell">
                    <div className="text-muted text-[10px]">Category</div>
                    <div className="font-semibold">{CATEGORY_LABELS[active.category] || active.category}</div>
                  </div>
                  <div className="ds-spec-cell">
                    <div className="text-muted text-[10px]">Variants</div>
                    <div className="font-semibold">{siblings.length} in category</div>
                  </div>
                </div>
              </div>

              <div className="ds-ctrl-group !mb-0">
                <div className="ds-ctrl-label">Available Formats</div>
                <div className="ds-format-grid">
                  {(active.formats || []).map((f) => (
                    <span key={f} className="ds-format-badge">{f}</span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
