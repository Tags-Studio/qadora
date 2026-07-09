import React, { useState, useEffect, useRef, useMemo } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import { GENERATORS, TYPE_TO_SHAPE, deriveDefaults } from '../utils/dielineGenerators';
import './DielineDetailPage.css';

const MATERIALS = [
  { id: 'e-flute', name: 'E-flute', t: 1.5 },
  { id: 'b-flute', name: 'B-flute', t: 3.0 },
  { id: 'kraft-300', name: 'Kraft 300g', t: 0.4 },
  { id: 'art-350', name: 'Art paper 350g', t: 0.45 },
  { id: 'grey-1200', name: 'Greyboard 1200g', t: 2.0 },
  { id: 'white-sbs', name: 'White SBS 400g', t: 0.5 },
];
const MM_PER_IN = 25.4;
const BLEED = 3;

// Sample a serialized THREE curve into [x,y] points.
function curveToPoints(c) {
  if (c.type === 'LineCurve') return [c.v1, c.v2];
  if (c.type === 'EllipseCurve') {
    const { aX, aY, xRadius, yRadius, aStartAngle, aEndAngle, aClockwise, aRotation } = c;
    const pts = [];
    const seg = 24;
    let a0 = aStartAngle, a1 = aEndAngle;
    if (!aClockwise && a1 < a0) a1 += Math.PI * 2;
    if (aClockwise && a1 > a0) a1 -= Math.PI * 2;
    for (let i = 0; i <= seg; i++) {
      const t = i / seg, ang = a0 + (a1 - a0) * t;
      let x = aX + Math.cos(ang) * xRadius;
      let y = aY + Math.sin(ang) * yRadius;
      if (aRotation) {
        const cosR = Math.cos(aRotation), sinR = Math.sin(aRotation);
        const dx = x - aX, dy = y - aY;
        x = aX + dx * cosR - dy * sinR;
        y = aY + dx * sinR + dy * cosR;
      }
      pts.push([x, y]);
    }
    return pts;
  }
  if (c.type === 'SplineCurve' || c.type === 'CubicBezierCurve' || c.type === 'QuadraticBezierCurve') {
    const keys = ['v0', 'v1', 'v2', 'v3'].filter((k) => c[k]);
    return keys.map((k) => c[k]);
  }
  return [];
}

// Build one SVG path string from a serialized THREE.Shape.
function shapeToPath(shape) {
  let d = '';
  let started = false;
  for (const c of shape.curves) {
    const pts = curveToPoints(c);
    for (let i = 0; i < pts.length; i++) {
      const [x, y] = pts[i];
      if (!started) { d += `M ${x} ${y}`; started = true; }
      else d += ` L ${x} ${y}`;
    }
  }
  if (shape.autoClose) d += ' Z';
  return d;
}

export default function DielineDetailPage({ dieline, onBack }) {
  const preset = useMemo(() => deriveDefaults(dieline), [dieline?.id]);

  const [unit, setUnit] = useState('mm');
  const [sizeMode, setSizeMode] = useState('manufacture');
  const [material, setMaterial] = useState(MATERIALS[0]);
  const [tab, setTab] = useState('dieline');

  const [L, setL] = useState(preset.L);
  const [W, setW] = useState(preset.W);
  const [H, setH] = useState(preset.H);
  const [T, setT] = useState(preset.T);

  // Real pacdora geometry state
  const [status, setStatus] = useState('idle'); // idle | loading | real | fallback
  const [real2D, setReal2D] = useState(null);    // { paths:[], vb:{x,y,w,h} }
  const realSceneJSON = useRef(null);

  // SVG pan/zoom
  const [svgScale, setSvgScale] = useState(1);
  const [svgPan, setSvgPan] = useState({ x: 0, y: 0 });
  const isPanning = useRef(false);
  const panStart = useRef({ x: 0, y: 0 });
  const svgContainerRef = useRef(null);

  // 3D
  const canvasRef = useRef(null);
  const three = useRef(null);
  const realObjRef = useRef(null);

  const gen = GENERATORS[preset.type] || GENERATORS['straight-tuck'];
  const paramData = useMemo(() => gen(L, W, H, T), [gen, L, W, H, T]);

  // ---- Fetch real pacdora geometry when a card opens ----
  useEffect(() => {
    let cancelled = false;
    setReal2D(null); realSceneJSON.current = null;
    setL(preset.L); setW(preset.W); setH(preset.H); setT(preset.T);

    if (!dieline?.num) { setStatus('fallback'); return; }
    setStatus('loading');
    fetch(`https://cloud.pacdora.com/demoProject/${dieline.num}.json`)
      .then((r) => { if (!r.ok) throw new Error('no demo'); return r.json(); })
      .then((json) => {
        if (cancelled) return;
        const scene = json.scene || json;
        const shapes = scene.shapes || [];
        if (!shapes.length) throw new Error('no shapes');

        // Build 2D paths + bbox
        const paths = shapes.map(shapeToPath).filter(Boolean);
        let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
        for (const sh of shapes) for (const c of sh.curves) for (const p of curveToPoints(c)) {
          minX = Math.min(minX, p[0]); minY = Math.min(minY, p[1]);
          maxX = Math.max(maxX, p[0]); maxY = Math.max(maxY, p[1]);
        }
        const vb = { x: minX, y: minY, w: maxX - minX, h: maxY - minY };
        setReal2D({ paths, vb });
        realSceneJSON.current = scene;

        // Derive real dims from sheet + typical proportions
        const sheetW = Math.round(json.totalX || vb.w);
        const sheetH = Math.round(json.totalY || vb.h);
        // Try 3D bbox for L/W/H after we load it (below). Use sheet as a hint now.
        setStatus('real');
      })
      .catch(() => { if (!cancelled) setStatus('fallback'); });
    return () => { cancelled = true; };
  }, [dieline?.id, dieline?.num]);

  // ---- 3D setup ----
  const setupScene = (canvas) => {
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0a0908);
    const cam = new THREE.PerspectiveCamera(45, canvas.clientWidth / canvas.clientHeight, 0.1, 100000);
    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
    renderer.setSize(canvas.clientWidth, canvas.clientHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    const controls = new OrbitControls(cam, canvas);
    controls.enableDamping = true; controls.dampingFactor = 0.08;
    scene.add(new THREE.AmbientLight(0xffffff, 0.8));
    const d1 = new THREE.DirectionalLight(0xffffff, 1.1); d1.position.set(1, 2, 1.5); scene.add(d1);
    const d2 = new THREE.DirectionalLight(0xffffff, 0.4); d2.position.set(-1, 0.5, -1); scene.add(d2);
    const group = new THREE.Group(); scene.add(group);
    return { scene, cam, renderer, controls, group };
  };

  useEffect(() => {
    if (!canvasRef.current) return;
    const obj = setupScene(canvasRef.current);
    three.current = obj;
    let raf;
    const animate = () => { raf = requestAnimationFrame(animate); obj.controls.update(); obj.renderer.render(obj.scene, obj.cam); };
    animate();
    const onResize = () => {
      const c = canvasRef.current; if (!c) return;
      obj.cam.aspect = c.clientWidth / c.clientHeight; obj.cam.updateProjectionMatrix();
      obj.renderer.setSize(c.clientWidth, c.clientHeight);
    };
    window.addEventListener('resize', onResize);
    return () => { cancelAnimationFrame(raf); window.removeEventListener('resize', onResize); obj.renderer.dispose(); three.current = null; };
  }, []);

  const frameObject = (object) => {
    const obj = three.current; if (!obj) return;
    const box = new THREE.Box3().setFromObject(object);
    const size = box.getSize(new THREE.Vector3());
    const center = box.getCenter(new THREE.Vector3());
    object.position.sub(center);
    const maxDim = Math.max(size.x, size.y, size.z) || 100;
    obj.cam.position.set(maxDim * 1.3, maxDim * 1.0, maxDim * 1.7);
    obj.cam.near = maxDim / 100; obj.cam.far = maxDim * 100; obj.cam.updateProjectionMatrix();
    obj.controls.target.set(0, 0, 0); obj.controls.update();
    return size;
  };

  // Build/replace 3D content whenever geometry source changes
  useEffect(() => {
    const obj = three.current; if (!obj) return;
    while (obj.group.children.length) obj.group.remove(obj.group.children[0]);
    realObjRef.current = null;

    if (status === 'real' && realSceneJSON.current) {
      try {
        const loader = new THREE.ObjectLoader();
        loader.parse(realSceneJSON.current, (loaded) => {
          if (!three.current) return;
          obj.group.add(loaded);
          realObjRef.current = loaded;
          const size = frameObject(loaded);
          if (size) { setL(Math.round(size.x)); setH(Math.round(size.y)); setW(Math.round(size.z)); }
        });
      } catch (e) { /* fall through to parametric on next deps */ }
    } else if (status === 'fallback') {
      // Parametric 3D
      const mat = new THREE.MeshPhysicalMaterial({ color: 0xdcbf94, roughness: 0.8, metalness: 0, side: THREE.DoubleSide, transparent: true, opacity: 0.96 });
      const edgeMat = new THREE.LineBasicMaterial({ color: 0x6b5636 });
      buildParametric3D(obj.group, mat, edgeMat, preset.type, L, W, H);
      const maxDim = Math.max(L, W, H);
      obj.cam.position.set(maxDim * 1.3, maxDim * 1.0, maxDim * 1.7);
      obj.cam.near = 0.1; obj.cam.far = maxDim * 100; obj.cam.updateProjectionMatrix();
      obj.controls.target.set(0, 0, 0); obj.controls.update();
    }
  }, [status, dieline?.id]);

  // Rebuild parametric 3D when dims change (only in fallback mode)
  useEffect(() => {
    const obj = three.current; if (!obj || status !== 'fallback') return;
    while (obj.group.children.length) obj.group.remove(obj.group.children[0]);
    const mat = new THREE.MeshPhysicalMaterial({ color: 0xdcbf94, roughness: 0.8, metalness: 0, side: THREE.DoubleSide, transparent: true, opacity: 0.96 });
    const edgeMat = new THREE.LineBasicMaterial({ color: 0x6b5636 });
    buildParametric3D(obj.group, mat, edgeMat, preset.type, L, W, H);
  }, [L, W, H, status, preset.type]);

  // Auto-fit SVG
  useEffect(() => {
    if (!svgContainerRef.current) return;
    const cw = svgContainerRef.current.clientWidth, ch = svgContainerRef.current.clientHeight;
    let bw, bh;
    if (status === 'real' && real2D) { bw = real2D.vb.w; bh = real2D.vb.h; }
    else { bw = paramData.width + BLEED * 2; bh = paramData.height + BLEED * 2; }
    const pad = 70;
    const fit = Math.min((cw - pad * 2) / bw, (ch - pad * 2) / bh, 3);
    setSvgScale(fit);
    setSvgPan({ x: (cw - bw * fit) / 2 - (status === 'real' && real2D ? real2D.vb.x * fit : 0), y: (ch - bh * fit) / 2 - (status === 'real' && real2D ? real2D.vb.y * fit : 0) });
  }, [status, real2D, paramData.width, paramData.height]);

  // Interactions
  const onWheel = (e) => {
    e.preventDefault();
    const f = e.deltaY < 0 ? 1.1 : 1 / 1.1;
    const cx = e.nativeEvent.offsetX, cy = e.nativeEvent.offsetY;
    setSvgPan((p) => ({ x: cx - (cx - p.x) * f, y: cy - (cy - p.y) * f }));
    setSvgScale((s) => Math.max(0.05, Math.min(12, s * f)));
  };
  const onDown = (e) => { isPanning.current = true; panStart.current = { x: e.clientX - svgPan.x, y: e.clientY - svgPan.y }; };
  const onMove = (e) => { if (isPanning.current) setSvgPan({ x: e.clientX - panStart.current.x, y: e.clientY - panStart.current.y }); };
  const onUp = () => { isPanning.current = false; };

  const dims = useMemo(() => ({
    manufacture: { L, W, H },
    inner: { L: L - T * 2, W: W - T * 2, H: H - T * 2 },
    outer: { L: L + T, W: W + T, H: H + T * 1.5 },
  }), [L, W, H, T]);
  const toDisp = (v) => (unit === 'mm' ? Math.round(v) : (v / MM_PER_IN).toFixed(2));
  const setDim = (setter) => (e) => { let v = +e.target.value; if (unit === 'in') v *= MM_PER_IN; setter(Math.round(v)); };

  const isReal = status === 'real' && real2D;

  return (
    <div className="dieline-studio-root">
      <header className="ds-header">
        <div className="flex items-center gap-2.5">
          <button onClick={onBack} className="btn mr-2 px-3"><i className="fas fa-arrow-left"></i> Back</button>
          <div className="w-8 h-8 bg-accent rounded-lg flex items-center justify-center"><i className="fas fa-cube text-bg text-sm"></i></div>
          <h1 className="text-base font-bold tracking-tight">Dieline Generator</h1>
          {isReal && <span className="ds-real-chip"><i className="fas fa-check-circle"></i> Real pacdora structure</span>}
          {status === 'fallback' && <span className="ds-approx-chip">Parametric approx.</span>}
        </div>
        <div className="flex-1 truncate px-4 text-xs text-muted hidden md:block">{dieline?.name}</div>
        <button className="btn btn-primary"><i className="fas fa-download"></i> Download the dieline</button>
      </header>

      <div className="flex h-[calc(100vh-56px)]">
        {/* Left panel */}
        <aside className="ds-left-panel">
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

          <div className="ds-ctrl-group">
            <div className="ds-ctrl-label">Choose material</div>
            <select className="ds-select" value={material.id} onChange={(e) => { const m = MATERIALS.find((x) => x.id === e.target.value); setMaterial(m); setT(m.t); }}>
              {MATERIALS.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
            </select>
          </div>

          <div className="ds-ctrl-group">
            <div className="ds-ctrl-label">Custom thickness</div>
            <div className="text-[10px] text-muted mb-1.5">(0.3 ~ 5 mm)</div>
            <div className="ds-stepper">
              <button onClick={() => setT((v) => Math.max(0.3, +(v - 0.1).toFixed(1)))}><i className="fas fa-minus"></i></button>
              <span>{T.toFixed(1)}</span>
              <button onClick={() => setT((v) => Math.min(5, +(v + 0.1).toFixed(1)))}><i className="fas fa-plus"></i></button>
            </div>
          </div>

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

          <div className="ds-ctrl-group">
            <div className="ds-ctrl-label">Template info</div>
            <div className="ds-spec-list">
              <div><span>Style</span>{dieline.style || '—'}</div>
              <div><span>Closure</span>{dieline.closure || '—'}</div>
              <div><span>Template</span>#{dieline.num || dieline.id}</div>
            </div>
          </div>
        </aside>

        {/* Center */}
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

          <div className="ds-tab-bar">
            <button className={`ds-tab-btn ${tab === 'dieline' ? 'active' : ''}`} onClick={() => setTab('dieline')}>
              <i className="fas fa-drafting-compass mr-1.5"></i>2D Dieline
            </button>
            <button className={`ds-tab-btn ${tab === 'preview' ? 'active' : ''}`} onClick={() => setTab('preview')}>
              <i className="fas fa-cube mr-1.5"></i>3D Preview
            </button>
          </div>

          {/* 2D */}
          <div
            className="ds-svg-container"
            style={{ display: tab === 'dieline' ? 'block' : 'none' }}
            ref={svgContainerRef}
            onWheel={onWheel} onMouseDown={onDown} onMouseMove={onMove} onMouseUp={onUp} onMouseLeave={onUp}
          >
            <div className="ds-svg-overlay">
              <button className="btn" onClick={() => setSvgScale((s) => s * 1.3)}><i className="fas fa-plus"></i></button>
              <button className="btn" onClick={() => setSvgScale((s) => Math.max(0.05, s / 1.3))}><i className="fas fa-minus"></i></button>
            </div>
            <div className="ds-info-bar">
              <span>{isReal ? 'Real dieline geometry' : (status === 'loading' ? 'Loading…' : 'Parametric dieline')}</span>
              <span>Sheet: {isReal ? `${real2D.vb.w.toFixed(0)} × ${real2D.vb.h.toFixed(0)}` : `${paramData.width.toFixed(0)} × ${paramData.height.toFixed(0)}`} mm</span>
            </div>
            {status === 'loading' && <div className="ds-loading"><i className="fas fa-circle-notch fa-spin"></i> Fetching real pacdora structure…</div>}
            <svg width="100%" height="100%">
              <g transform={`translate(${svgPan.x},${svgPan.y}) scale(${svgScale})`}>
                {isReal ? (
                  real2D.paths.map((d, i) => (
                    <path key={`r-${i}`} d={d} fill="none" stroke="var(--cut)" strokeWidth={0.6 / svgScale} shapeRendering="geometricPrecision" />
                  ))
                ) : (
                  <>
                    <defs>
                      <filter id="bleedDilate" x="-30%" y="-30%" width="160%" height="160%">
                        <feMorphology operator="dilate" radius={BLEED} in="SourceGraphic" result="dil" />
                        <feComposite in="dil" in2="SourceGraphic" operator="out" result="ring" />
                        <feFlood floodColor="var(--bleed)" result="col" />
                        <feComposite in="col" in2="ring" operator="in" result="bleed" />
                      </filter>
                    </defs>
                    <g filter="url(#bleedDilate)">
                      {paramData.cut.map((d, i) => <path key={`b-${i}`} d={d} fill="#000" stroke="none" />)}
                    </g>
                    {paramData.crease.map((d, i) => (
                      <path key={`cr-${i}`} d={d} fill="none" stroke="var(--crease)" strokeWidth={0.9 / svgScale} strokeDasharray={`${4 / svgScale},${3 / svgScale}`} />
                    ))}
                    {paramData.cut.map((d, i) => (
                      <path key={`ct-${i}`} d={d} fill="none" stroke="var(--cut)" strokeWidth={1.3 / svgScale} />
                    ))}
                    {paramData.annotations && paramData.annotations.map((a, i) => (
                      a.dim ? (
                        <text key={`a-${i}`} x={a.x} y={a.y} className="ds-dim-text" textAnchor="middle" transform={a.rotate ? `rotate(-90,${a.x},${a.y})` : ''}>{a.text} mm</text>
                      ) : (
                        <text key={`a-${i}`} x={a.x} y={a.y} className="ds-panel-label" textAnchor="middle">{a.text}</text>
                      )
                    ))}
                  </>
                )}
              </g>
            </svg>
          </div>

          {/* 3D */}
          <div className="ds-svg-container !bg-[#0a0908]" style={{ display: tab === 'preview' ? 'block' : 'none' }}>
            <canvas ref={canvasRef} className="w-full h-full block" />
            <div className="ds-info-bar">
              <span><i className="fas fa-mouse-pointer text-[10px]"></i> Drag to rotate · Scroll to zoom</span>
              <span>{isReal ? 'Real 3D model' : 'Parametric 3D'}</span>
            </div>
          </div>
        </div>

        {/* Right */}
        <aside className="ds-right-panel">
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

// ---- Parametric 3D fallback ----
function buildParametric3D(group, mat, edgeMat, type, L, W, H) {
  const hw = W / 2, hl = L / 2, hh = H / 2;
  const shape = TYPE_TO_SHAPE[type] || 'closed';
  const addPanel = (w, h, px, py, pz, rx, ry, rz) => {
    const geo = new THREE.PlaneGeometry(w, h);
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.set(px, py, pz); mesh.rotation.set(rx || 0, ry || 0, rz || 0);
    group.add(mesh);
    const line = new THREE.LineSegments(new THREE.EdgesGeometry(geo), edgeMat);
    line.position.copy(mesh.position); line.rotation.copy(mesh.rotation);
    group.add(line);
  };
  const walls = (bottom = true) => {
    addPanel(W, H, 0, 0, hl, 0, 0, 0);
    addPanel(W, H, 0, 0, -hl, 0, Math.PI, 0);
    addPanel(L, H, -hw, 0, 0, 0, -Math.PI / 2, 0);
    addPanel(L, H, hw, 0, 0, 0, Math.PI / 2, 0);
    if (bottom) addPanel(W, L, 0, -hh, 0, -Math.PI / 2, 0, 0);
  };
  if (shape === 'sleeve') walls(false);
  else if (shape === 'tray') walls(true);
  else if (shape === 'hexagonal') {
    const R = Math.max(W, L) / 2, n = 6;
    for (let i = 0; i < n; i++) {
      const a0 = (i / n) * Math.PI * 2, a1 = ((i + 1) / n) * Math.PI * 2;
      const x0 = Math.cos(a0) * R, z0 = Math.sin(a0) * R, x1 = Math.cos(a1) * R, z1 = Math.sin(a1) * R;
      const side = Math.hypot(x1 - x0, z1 - z0), ang = Math.atan2(z1 - z0, x1 - x0);
      addPanel(side, H, (x0 + x1) / 2, 0, (z0 + z1) / 2, 0, -ang + Math.PI / 2, 0);
    }
  } else if (shape === 'pillow') {
    const geo = new THREE.CylinderGeometry(H / 2, H / 2, W, 24);
    const mesh = new THREE.Mesh(geo, mat); mesh.scale.set(1, 1, 0.55); mesh.rotation.z = Math.PI / 2; group.add(mesh);
  } else if (shape === 'gable') {
    walls(true);
    const rise = Math.max(H * 0.45, 18);
    addPanel(W, Math.hypot(hl, rise), 0, hh + rise / 2, hl / 2, -0.85, 0, 0);
    addPanel(W, Math.hypot(hl, rise), 0, hh + rise / 2, -hl / 2, 0.85, 0, 0);
  } else { // closed
    walls(true);
    addPanel(W, L, 0, hh, 0, -Math.PI / 2, 0, 0);
  }
}
