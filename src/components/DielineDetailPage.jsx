import React, { useState, useEffect, useRef, useMemo } from 'react';
import { deriveDefaults } from '../utils/dielineGenerators';
import './DielineDetailPage.css';

// Upgrade pacdora CDN thumbnails (300px) to a higher-res variant for the editor.
function hires(url, size = 1200) {
  if (!url) return url;
  return url.replace(/image-resize\/\d+xauto_outside/, `image-resize/${size}xauto_outside`);
}

const MATERIALS = [
  { id: 'e-flute', name: 'E-flute', t: 1.5 },
  { id: 'b-flute', name: 'B-flute', t: 3.0 },
  { id: 'kraft-300', name: 'Kraft 300g', t: 0.4 },
  { id: 'art-350', name: 'Art paper 350g', t: 0.45 },
  { id: 'grey-1200', name: 'Greyboard 1200g', t: 2.0 },
  { id: 'white-sbs', name: 'White SBS 400g', t: 0.5 },
];

const MM_PER_IN = 25.4;

export default function DielineDetailPage({ dieline, onBack }) {
  // Derive stable starting dimensions from the card (for the editor controls).
  const preset = useMemo(() => deriveDefaults(dieline), [dieline?.id]);

  const [unit, setUnit] = useState('mm');
  const [sizeMode, setSizeMode] = useState('manufacture');
  const [material, setMaterial] = useState(MATERIALS[0]);
  const [tab, setTab] = useState('dieline'); // 'dieline' | 'preview'

  const [L, setL] = useState(preset.L);
  const [W, setW] = useState(preset.W);
  const [H, setH] = useState(preset.H);
  const [T, setT] = useState(preset.T);

  useEffect(() => { setL(preset.L); setW(preset.W); setH(preset.H); setT(preset.T); }, [preset]);

  // Zoom / pan for the dieline image
  const [scale, setScale] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const isPanning = useRef(false);
  const panStart = useRef({ x: 0, y: 0 });

  useEffect(() => { setScale(1); setPan({ x: 0, y: 0 }); }, [dieline?.id, tab]);

  const onWheel = (e) => {
    e.preventDefault();
    const f = e.deltaY < 0 ? 1.12 : 1 / 1.12;
    const cx = e.nativeEvent.offsetX, cy = e.nativeEvent.offsetY;
    setPan((p) => ({ x: cx - (cx - p.x) * f, y: cy - (cy - p.y) * f }));
    setScale((s) => Math.max(0.3, Math.min(6, s * f)));
  };
  const onDown = (e) => { isPanning.current = true; panStart.current = { x: e.clientX - pan.x, y: e.clientY - pan.y }; };
  const onMove = (e) => { if (isPanning.current) setPan({ x: e.clientX - panStart.current.x, y: e.clientY - panStart.current.y }); };
  const onUp = () => { isPanning.current = false; };
  const resetView = () => { setScale(1); setPan({ x: 0, y: 0 }); };

  // Derived manufacture / inner / outer dimensions
  const dims = useMemo(() => ({
    manufacture: { L, W, H },
    inner: { L: L - T * 2, W: W - T * 2, H: H - T * 2 },
    outer: { L: L + T, W: W + T, H: H + T * 1.5 },
  }), [L, W, H, T]);
  const toDisp = (v) => (unit === 'mm' ? Math.round(v) : (v / MM_PER_IN).toFixed(2));
  const setDim = (setter) => (e) => {
    let v = +e.target.value;
    if (unit === 'in') v = v * MM_PER_IN;
    setter(Math.round(v));
  };

  const currentImg = tab === 'dieline' ? hires(dieline.dieline_image, 1200) : hires(dieline.image, 1000);

  return (
    <div className="dieline-studio-root">
      {/* Header */}
      <header className="ds-header">
        <div className="flex items-center gap-2.5">
          <button onClick={onBack} className="btn mr-2 px-3"><i className="fas fa-arrow-left"></i> Back</button>
          <div className="w-8 h-8 bg-accent rounded-lg flex items-center justify-center"><i className="fas fa-cube text-bg text-sm"></i></div>
          <h1 className="text-base font-bold tracking-tight">Dieline Generator</h1>
        </div>
        <div className="flex-1 truncate px-4 text-xs text-muted hidden md:block">{dieline?.name}</div>
        <button className="btn btn-primary" onClick={() => window.open(hires(dieline.dieline_image, 2000), '_blank')}>
          <i className="fas fa-download"></i> Download the dieline
        </button>
      </header>

      <div className="flex h-[calc(100vh-56px)]">
        {/* Left control panel */}
        <aside className="ds-left-panel">
          {/* Custom size */}
          <div className="ds-ctrl-group">
            <div className="flex items-center justify-between mb-1.5">
              <div className="ds-ctrl-label !mb-0">Custom size</div>
              <div className="ds-unit-toggle">
                <button className={unit === 'mm' ? 'active' : ''} onClick={() => setUnit('mm')}>mm</button>
                <button className={unit === 'in' ? 'active' : ''} onClick={() => setUnit('in')}>in</button>
              </div>
            </div>
            <div className="ds-size-grid">
              <label>Length<input type="number" value={toDisp(L)} onChange={setDim(setL)} /><span>{unit}</span></label>
              <label>Width<input type="number" value={toDisp(W)} onChange={setDim(setW)} /><span>{unit}</span></label>
              <label>Height<input type="number" value={toDisp(H)} onChange={setDim(setH)} /><span>{unit}</span></label>
            </div>
          </div>

          {/* Material */}
          <div className="ds-ctrl-group">
            <div className="ds-ctrl-label">Choose material</div>
            <select className="ds-select" value={material.id} onChange={(e) => { const m = MATERIALS.find((x) => x.id === e.target.value); setMaterial(m); setT(m.t); }}>
              {MATERIALS.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
            </select>
          </div>

          {/* Thickness */}
          <div className="ds-ctrl-group">
            <div className="ds-ctrl-label">Custom thickness</div>
            <div className="text-[10px] text-muted mb-1.5">(0.3 ~ 5 mm)</div>
            <div className="ds-stepper">
              <button onClick={() => setT((v) => Math.max(0.3, +(v - 0.1).toFixed(1)))}><i className="fas fa-minus"></i></button>
              <span>{T.toFixed(1)}</span>
              <button onClick={() => setT((v) => Math.min(5, +(v + 0.1).toFixed(1)))}><i className="fas fa-plus"></i></button>
            </div>
          </div>

          {/* Size mode */}
          <div className="ds-ctrl-group">
            <div className="ds-ctrl-label">Size mode</div>
            <div className="ds-mode-grid">
              {['manufacture', 'inner', 'outer'].map((m) => (
                <button key={m} className={`ds-mode-btn ${sizeMode === m ? 'active' : ''}`} onClick={() => setSizeMode(m)}>
                  {m[0].toUpperCase() + m.slice(1)}<br />dimensions
                </button>
              ))}
            </div>
          </div>

          {/* Specs from pacdora data */}
          <div className="ds-ctrl-group">
            <div className="ds-ctrl-label">Template info</div>
            <div className="ds-spec-list">
              <div><span>Style</span>{dieline.style || '—'}</div>
              <div><span>Closure</span>{dieline.closure || '—'}</div>
              <div><span>Template</span>#{dieline.id}</div>
            </div>
          </div>
        </aside>

        {/* Center: dieline canvas */}
        <div className="ds-main-area">
          <div className="ds-legend-bar">
            <div className="ds-legend">
              <span><span className="ds-line-swatch bleed"></span>Bleed</span>
              <span><span className="ds-line-swatch trim"></span>Trim</span>
              <span><span className="ds-line-swatch crease"></span>Crease</span>
            </div>
            <div className="ds-dims-readout">
              <div><span className="lbl">Manufacture</span> {toDisp(dims.manufacture.L)} × {toDisp(dims.manufacture.W)} × {toDisp(dims.manufacture.H)} {unit}</div>
              <div><span className="lbl">Inner</span> {toDisp(dims.inner.L)} × {toDisp(dims.inner.W)} × {toDisp(dims.inner.H)} {unit}</div>
              <div><span className="lbl">Outer</span> {toDisp(dims.outer.L)} × {toDisp(dims.outer.W)} × {toDisp(dims.outer.H)} {unit}</div>
            </div>
          </div>

          {/* Tabs */}
          <div className="ds-tab-bar">
            <button className={`ds-tab-btn ${tab === 'dieline' ? 'active' : ''}`} onClick={() => setTab('dieline')}>
              <i className="fas fa-drafting-compass mr-1.5"></i>2D Dieline
            </button>
            <button className={`ds-tab-btn ${tab === 'preview' ? 'active' : ''}`} onClick={() => setTab('preview')}>
              <i className="fas fa-cube mr-1.5"></i>3D Preview
            </button>
          </div>

          <div
            className={`ds-svg-container ${tab === 'preview' ? 'is-3d' : ''}`}
            onWheel={onWheel} onMouseDown={onDown} onMouseMove={onMove} onMouseUp={onUp} onMouseLeave={onUp}
          >
            <div className="ds-svg-overlay">
              <button className="btn" onClick={() => setScale((s) => Math.min(6, s * 1.3))}><i className="fas fa-plus"></i></button>
              <button className="btn" onClick={() => setScale((s) => Math.max(0.3, s / 1.3))}><i className="fas fa-minus"></i></button>
              <button className="btn" onClick={resetView}><i className="fas fa-expand"></i></button>
            </div>
            <div className="ds-info-bar">
              <span><i className="fas fa-mouse-pointer text-[10px]"></i> Drag to pan · Scroll to zoom</span>
            </div>
            <div className="ds-image-stage">
              <img
                key={currentImg}
                src={currentImg}
                alt={dieline.name}
                className="ds-stage-img"
                draggable="false"
                style={{ transform: `translate(${pan.x}px, ${pan.y}px) scale(${scale})` }}
              />
            </div>
          </div>
        </div>

        {/* Right: real 3D mockup + formats */}
        <aside className="ds-right-panel">
          <div className="ds-ctrl-label">3D mockup</div>
          <div className="ds-3d-box">
            <span className="ds-3d-badge">3D</span>
            <img src={hires(dieline.image, 800)} alt={dieline.name} className="ds-mini-mockup" />
          </div>

          <div className="ds-ctrl-label mt-4">File formats</div>
          <div className="ds-format-grid2">
            <div className="ds-fmt-card"><i className="fab fa-adobe"></i> AI dieline</div>
            <div className="ds-fmt-card"><i className="fas fa-file-pdf"></i> PDF dieline</div>
            <div className="ds-fmt-card"><i className="fas fa-vector-square"></i> DXF dieline</div>
            <div className="ds-fmt-card" onClick={() => window.open(hires(dieline.image, 1600), '_blank')}><i className="fas fa-image"></i> 3D mockup</div>
          </div>

          <div className="ds-ctrl-label mt-4">You will get</div>
          <ul className="ds-getlist">
            <li>All dieline files generated and downloaded within a few minutes.</li>
            <li>Structurally inspected — dimensions, thickness &amp; material included.</li>
            <li>No watermarks; editable in Adobe Illustrator.</li>
          </ul>
        </aside>
      </div>
    </div>
  );
}
