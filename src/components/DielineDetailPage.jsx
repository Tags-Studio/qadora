import React, { useState, useEffect, useRef, useMemo } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import {
  BOX_TYPES, GENERATORS, CATEGORY_TO_TYPE, TYPE_TO_SHAPE, deriveDefaults,
} from '../utils/dielineGenerators';
import './DielineDetailPage.css';

const MATERIALS = [
  { id: 'e-flute', name: 'E-flute', t: 1.5 },
  { id: 'b-flute', name: 'B-flute', t: 3.0 },
  { id: 'kraft-300', name: 'Kraft 300g', t: 0.4 },
  { id: 'art-350', name: 'Art paper 350g', t: 0.45 },
  { id: 'grey-1200', name: 'Greyboard 1200g', t: 2.0 },
  { id: 'white-sbs', name: 'White SBS 400g', t: 0.5 },
];

const BLEED = 3;
const MM_PER_IN = 25.4;

export default function DielineDetailPage({ dieline, onBack }) {
  // Derive a STABLE per-card design (type + dimensions) from the card data.
  const preset = useMemo(() => deriveDefaults(dieline), [dieline?.id]);

  const [currentType, setCurrentType] = useState(preset.type);
  const [unit, setUnit] = useState('mm');
  const [sizeMode, setSizeMode] = useState('manufacture'); // manufacture | inner | outer
  const [material, setMaterial] = useState(MATERIALS[0]);

  // Dimensions (manufacture / nominal) in mm — seeded per card.
  const [L, setL] = useState(preset.L);
  const [W, setW] = useState(preset.W);
  const [H, setH] = useState(preset.H);
  const [T, setT] = useState(preset.T);
  const [openClose, setOpenClose] = useState(1); // 1 = closed, 0 = open (fold factor)

  // Re-apply the derived preset whenever a new card is opened.
  useEffect(() => {
    setCurrentType(preset.type);
    setL(preset.L); setW(preset.W); setH(preset.H); setT(preset.T);
  }, [preset]);

  // SVG pan / zoom
  const [svgScale, setSvgScale] = useState(1);
  const [svgPan, setSvgPan] = useState({ x: 0, y: 0 });
  const isPanning = useRef(false);
  const panStart = useRef({ x: 0, y: 0 });
  const svgContainerRef = useRef(null);

  // 3D
  const canvasRef = useRef(null);
  const sceneRef = useRef(null);

  const gen = GENERATORS[currentType] || GENERATORS['straight-tuck'];
  const dielineData = useMemo(() => gen(L, W, H, T), [gen, L, W, H, T]);

  const typeInfo = useMemo(() => {
    for (const c of BOX_TYPES) { const it = c.items.find((i) => i.id === currentType); if (it) return it; }
    return { name: 'Custom Box' };
  }, [currentType]);

  // Derived manufacture / inner / outer dimensions
  const dims = useMemo(() => {
    const manu = { L, W, H };
    const inner = { L: L - T * 2, W: W - T * 2, H: H - T * 2 };
    const outer = { L: L + T, W: W + T, H: H + T * 1.5 };
    return { manufacture: manu, inner, outer };
  }, [L, W, H, T]);

  const toDisp = (v) => (unit === 'mm' ? v.toFixed(0) : (v / MM_PER_IN).toFixed(2));

  // Fit SVG whenever geometry changes fundamentally
  useEffect(() => {
    if (!dielineData || !svgContainerRef.current) return;
    const cw = svgContainerRef.current.clientWidth;
    const ch = svgContainerRef.current.clientHeight;
    const bw = dielineData.width + BLEED * 2;
    const bh = dielineData.height + BLEED * 2;
    const pad = 70;
    const fit = Math.min((cw - pad * 2) / bw, (ch - pad * 2) / bh, 2.4);
    setSvgScale(fit);
    setSvgPan({ x: (cw - bw * fit) / 2, y: (ch - bh * fit) / 2 });
  }, [dielineData.width, dielineData.height, currentType]);

  // ---- 3D builder (mirrors the selected box type) ----
  const build3D = (group, mat, edgeMat) => {
    while (group.children.length) group.remove(group.children[0]);
    const hw = W / 2, hl = L / 2, hh = H / 2;
    const fold = openClose; // 1 closed, 0 open
    const shape = TYPE_TO_SHAPE[currentType] || 'closed';

    const addPanel = (w, h, px, py, pz, rx, ry, rz) => {
      const geo = new THREE.PlaneGeometry(w, h);
      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.set(px, py, pz); mesh.rotation.set(rx || 0, ry || 0, rz || 0);
      group.add(mesh);
      const line = new THREE.LineSegments(new THREE.EdgesGeometry(geo), edgeMat);
      line.position.copy(mesh.position); line.rotation.copy(mesh.rotation);
      group.add(line);
    };
    const addPivot = (w, h, px, py, pz, rx) => {
      const geo = new THREE.PlaneGeometry(w, h);
      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.set(0, h / 2, 0);
      const pivot = new THREE.Group();
      pivot.position.set(px, py, pz); pivot.rotation.x = rx;
      pivot.add(mesh);
      const line = new THREE.LineSegments(new THREE.EdgesGeometry(geo), edgeMat);
      line.position.copy(mesh.position);
      pivot.add(line);
      group.add(pivot);
    };
    const walls = (bottom = true) => {
      addPanel(W, H, 0, 0, hl, 0, 0, 0);
      addPanel(W, H, 0, 0, -hl, 0, Math.PI, 0);
      addPanel(L, H, -hw, 0, 0, 0, -Math.PI / 2, 0);
      addPanel(L, H, hw, 0, 0, 0, Math.PI / 2, 0);
      if (bottom) addPanel(W, L, 0, -hh, 0, -Math.PI / 2, 0, 0);
    };
    const topFlaps = () => {
      const a = -(1 - fold) * 1.4; // open angle
      addPivot(W, L / 2, 0, hh, hl, a - Math.PI / 2 + Math.PI / 2);
      addPivot(W, L / 2, 0, hh, -hl, -a + Math.PI / 2 - Math.PI / 2 + Math.PI);
    };

    if (shape === 'sleeve') { walls(false); }
    else if (shape === 'tray') { walls(true); }
    else if (shape === 'twopiece') {
      walls(true);
      // lid hovering above, lifts as it "opens"
      const lift = hh + (1 - fold) * H * 0.9 + 6;
      addPanel(W + 6, L + 6, 0, lift, 0, -Math.PI / 2, 0, 0);
      addPanel(W + 6, H * 0.32, 0, lift - H * 0.16, hl + 3, 0, 0, 0);
      addPanel(W + 6, H * 0.32, 0, lift - H * 0.16, -hl - 3, 0, Math.PI, 0);
      addPanel(L + 6, H * 0.32, -hw - 3, lift - H * 0.16, 0, 0, -Math.PI / 2, 0);
      addPanel(L + 6, H * 0.32, hw + 3, lift - H * 0.16, 0, 0, Math.PI / 2, 0);
    }
    else if (shape === 'gable') {
      walls(true);
      const rise = Math.max(H * 0.45, 18);
      addPanel(W, Math.hypot(hl, rise), 0, hh + rise / 2, hl / 2, -0.85, 0, 0);
      addPanel(W, Math.hypot(hl, rise), 0, hh + rise / 2, -hl / 2, 0.85, 0, 0);
    }
    else if (shape === 'hexagonal') {
      const R = Math.max(W, L) / 2, n = 6;
      const top = [], bot = [];
      for (let i = 0; i < n; i++) {
        const a0 = (i / n) * Math.PI * 2, a1 = ((i + 1) / n) * Math.PI * 2;
        const x0 = Math.cos(a0) * R, z0 = Math.sin(a0) * R;
        const x1 = Math.cos(a1) * R, z1 = Math.sin(a1) * R;
        const midx = (x0 + x1) / 2, midz = (z0 + z1) / 2;
        const side = Math.hypot(x1 - x0, z1 - z0);
        const ang = Math.atan2(z1 - z0, x1 - x0);
        addPanel(side, H, midx, 0, midz, 0, -ang + Math.PI / 2, 0);
      }
      // top & bottom hex caps (approx with thin cylinder)
      const capGeo = new THREE.CircleGeometry(R, 6);
      const capTop = new THREE.Mesh(capGeo, mat); capTop.rotation.x = -Math.PI / 2; capTop.position.y = hh; group.add(capTop);
      const capBot = new THREE.Mesh(capGeo, mat); capBot.rotation.x = Math.PI / 2; capBot.position.y = -hh; group.add(capBot);
    }
    else if (shape === 'pillow') {
      const geo = new THREE.CylinderGeometry(H / 2, H / 2, W, 24, 1, false, 0, Math.PI * 2);
      const scaleZ = 0.55;
      const mesh = new THREE.Mesh(geo, mat);
      mesh.scale.set(1, 1, scaleZ);
      mesh.rotation.z = Math.PI / 2;
      group.add(mesh);
    }
    else { // closed (tuck / mailer / autolock / window / hanger)
      walls(true);
      topFlaps();
    }
  };

  const setupScene = (canvas) => {
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0a0908);
    const cam = new THREE.PerspectiveCamera(45, canvas.clientWidth / canvas.clientHeight, 1, 3000);
    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
    renderer.setSize(canvas.clientWidth, canvas.clientHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    const controls = new OrbitControls(cam, canvas);
    controls.enableDamping = true; controls.dampingFactor = 0.08;
    scene.add(new THREE.AmbientLight(0xfff5e6, 0.6));
    const d1 = new THREE.DirectionalLight(0xffffff, 1.2); d1.position.set(120, 200, 160); scene.add(d1);
    const d2 = new THREE.DirectionalLight(0xd4913b, 0.35); d2.position.set(-120, 60, -120); scene.add(d2);
    const grid = new THREE.GridHelper(700, 30, 0x2a2319, 0x1a1612); grid.position.y = -160; scene.add(grid);
    const group = new THREE.Group(); scene.add(group);
    return { scene, cam, renderer, controls, group };
  };

  useEffect(() => {
    if (!canvasRef.current) return;
    const obj = setupScene(canvasRef.current);
    sceneRef.current = obj;
    let raf;
    const animate = () => { raf = requestAnimationFrame(animate); obj.controls.update(); obj.renderer.render(obj.scene, obj.cam); };
    animate();
    const onResize = () => {
      if (!canvasRef.current) return;
      obj.cam.aspect = canvasRef.current.clientWidth / canvasRef.current.clientHeight;
      obj.cam.updateProjectionMatrix();
      obj.renderer.setSize(canvasRef.current.clientWidth, canvasRef.current.clientHeight);
    };
    window.addEventListener('resize', onResize);
    return () => { cancelAnimationFrame(raf); window.removeEventListener('resize', onResize); obj.renderer.dispose(); sceneRef.current = null; };
  }, []);

  useEffect(() => {
    const obj = sceneRef.current; if (!obj) return;
    const mat = new THREE.MeshPhysicalMaterial({ color: 0xdcbf94, roughness: 0.8, metalness: 0, side: THREE.DoubleSide, transparent: true, opacity: 0.96 });
    const edgeMat = new THREE.LineBasicMaterial({ color: 0x6b5636 });
    build3D(obj.group, mat, edgeMat);
    const maxDim = Math.max(L, W, H);
    obj.cam.position.set(maxDim * 1.3, maxDim * 1.0, maxDim * 1.6);
    obj.controls.target.set(0, 0, 0); obj.controls.update();
  }, [L, W, H, currentType, openClose]);

  // ---- interactions ----
  const onWheel = (e) => {
    e.preventDefault();
    const f = e.deltaY < 0 ? 1.1 : 1 / 1.1;
    const cx = e.nativeEvent.offsetX, cy = e.nativeEvent.offsetY;
    setSvgPan((p) => ({ x: cx - (cx - p.x) * f, y: cy - (cy - p.y) * f }));
    setSvgScale((s) => Math.max(0.1, Math.min(6, s * f)));
  };
  const onDown = (e) => { isPanning.current = true; panStart.current = { x: e.clientX - svgPan.x, y: e.clientY - svgPan.y }; };
  const onMove = (e) => { if (isPanning.current) setSvgPan({ x: e.clientX - panStart.current.x, y: e.clientY - panStart.current.y }); };
  const onUp = () => { isPanning.current = false; };

  const setDim = (setter) => (e) => {
    let v = +e.target.value;
    if (unit === 'in') v = v * MM_PER_IN;
    setter(Math.round(v));
  };

  const D = dims[sizeMode];

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
        <button className="btn btn-primary"><i className="fas fa-download"></i> Download the dieline</button>
      </header>

      <div className="flex h-[calc(100vh-56px)]">
        {/* Left control panel */}
        <aside className="ds-left-panel">
          {/* Models */}
          <div className="ds-ctrl-group">
            <div className="ds-ctrl-label">Model</div>
            <select className="ds-select" value={currentType} onChange={(e) => setCurrentType(e.target.value)}>
              {BOX_TYPES.map((c) => (
                <optgroup key={c.cat} label={c.cat}>
                  {c.items.map((it) => <option key={it.id} value={it.id}>{it.name}</option>)}
                </optgroup>
              ))}
            </select>
          </div>

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
        </aside>

        {/* Center: dieline canvas */}
        <div className="ds-main-area">
          {/* Legend + dimensions */}
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

          <div
            className="ds-svg-container"
            ref={svgContainerRef}
            onWheel={onWheel} onMouseDown={onDown} onMouseMove={onMove} onMouseUp={onUp} onMouseLeave={onUp}
          >
            <div className="ds-svg-overlay">
              <button className="btn" onClick={() => setSvgScale((s) => s * 1.3)}><i className="fas fa-plus"></i></button>
              <button className="btn" onClick={() => setSvgScale((s) => Math.max(0.1, s / 1.3))}><i className="fas fa-minus"></i></button>
            </div>
            <div className="ds-info-bar">
              <span>{typeInfo.name}</span>
              <span>Sheet: {dielineData.width.toFixed(0)} × {dielineData.height.toFixed(0)} mm</span>
            </div>
            <svg width="100%" height="100%">
              <g transform={`translate(${svgPan.x},${svgPan.y}) scale(${svgScale})`}>
                <defs>
                  <filter id="bleedDilate" x="-30%" y="-30%" width="160%" height="160%">
                    <feMorphology operator="dilate" radius={BLEED} in="SourceGraphic" result="dil" />
                    <feComposite in="dil" in2="SourceGraphic" operator="out" result="ring" />
                    <feFlood floodColor="var(--bleed)" result="col" />
                    <feComposite in="col" in2="ring" operator="in" result="bleed" />
                  </filter>
                </defs>
                <g filter="url(#bleedDilate)">
                  {dielineData.cut.map((d, i) => <path key={`b-${i}`} d={d} fill="#000" stroke="none" />)}
                </g>
                {dielineData.crease.map((d, i) => (
                  <path key={`cr-${i}`} d={d} fill="none" stroke="var(--crease)" strokeWidth={0.9 / svgScale} strokeDasharray={`${4 / svgScale},${3 / svgScale}`} />
                ))}
                {dielineData.cut.map((d, i) => (
                  <path key={`ct-${i}`} d={d} fill="none" stroke="var(--cut)" strokeWidth={1.3 / svgScale} />
                ))}
                {dielineData.annotations && dielineData.annotations.map((a, i) => (
                  a.dim ? (
                    <text key={`a-${i}`} x={a.x} y={a.y} className="ds-dim-text" textAnchor="middle" transform={a.rotate ? `rotate(-90,${a.x},${a.y})` : ''}>{a.text} mm</text>
                  ) : (
                    <text key={`a-${i}`} x={a.x} y={a.y} className="ds-panel-label" textAnchor="middle">{a.text}</text>
                  )
                ))}
              </g>
            </svg>
          </div>
        </div>

        {/* Right: 3D + formats */}
        <aside className="ds-right-panel">
          <div className="ds-3d-box">
            <span className="ds-3d-badge">3D</span>
            <canvas ref={canvasRef} className="w-full h-full block" />
          </div>
          <div className="ds-openclose">
            <span>Open</span>
            <input type="range" min="0" max="1" step="0.01" value={openClose} onChange={(e) => setOpenClose(+e.target.value)} />
            <span>Close</span>
          </div>

          <div className="ds-ctrl-label mt-4">File formats</div>
          <div className="ds-format-grid2">
            <div className="ds-fmt-card"><i className="fab fa-adobe"></i> AI dieline</div>
            <div className="ds-fmt-card"><i className="fas fa-file-pdf"></i> PDF dieline</div>
            <div className="ds-fmt-card"><i className="fas fa-vector-square"></i> DXF dieline</div>
            <div className="ds-fmt-card"><i className="fas fa-image"></i> 3D mockup</div>
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
