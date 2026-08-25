import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import { GENERATORS, TYPE_TO_SHAPE, deriveDefaults } from '../utils/dielineGenerators';
import { deriveUnits, computeBleedOffset, computeBleedOffsetFromSVG, classifyContours } from '../utils/bleedOffset';
import { loadCatalog } from '../data/catalog';
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
// BLEED is now a state variable (default 3mm, adjustable via stepper)

// ── helpers ──────────────────────────────────────────────

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

// Build one SVG path string from a list of [x,y] points.
function pointsToPath(pts) {
  if (!pts.length) return '';
  let d = `M ${pts[0][0]} ${pts[0][1]}`;
  for (let i = 1; i < pts.length; i++) d += ` L ${pts[i][0]} ${pts[i][1]}`;
  return d;
}

// Build one SVG path string from a serialized THREE.Shape (legacy, used for fallback shapes).
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

// ── classify real pacdora shapes into CUT vs CREASE ──────
// Shapes come in pairs: even = panel outline, odd = hinge marker.
// LineCurve segments shared between 2+ panels = CREASE (fold line).
// Non-shared segments + all EllipseCurves = CUT (trim line).
function classifyRealPaths(shapes) {
  const segMap = new Map(); // key → count

  // First pass: count LineCurve segments across panel shapes (even indices)
  for (let i = 0; i < shapes.length; i += 2) {
    for (const c of shapes[i].curves) {
      if (c.type === 'LineCurve') {
        const v1 = c.v1, v2 = c.v2;
        // Normalise endpoint order so shared edges match
        const key = [v1, v2]
          .sort((a, b) => a[0] - b[0] || a[1] - b[1])
          .map((p) => `${p[0]},${p[1]}`)
          .join('|');
        segMap.set(key, (segMap.get(key) || 0) + 1);
      }
    }
  }

  const cutPaths = [];
  const creasePaths = [];
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;

  // Second pass: build path strings, classify each segment
  for (let i = 0; i < shapes.length; i += 2) {
    for (const c of shapes[i].curves) {
      const pts = curveToPoints(c);
      for (const p of pts) {
        minX = Math.min(minX, p[0]); minY = Math.min(minY, p[1]);
        maxX = Math.max(maxX, p[0]); maxY = Math.max(maxY, p[1]);
      }
      if (c.type === 'LineCurve') {
        const v1 = c.v1, v2 = c.v2;
        const key = [v1, v2]
          .sort((a, b) => a[0] - b[0] || a[1] - b[1])
          .map((p) => `${p[0]},${p[1]}`)
          .join('|');
        const path = `M ${v1[0]} ${v1[1]} L ${v2[0]} ${v2[1]}`;
        if (segMap.get(key) > 1) {
          creasePaths.push(path);
        } else {
          cutPaths.push(path);
        }
      } else {
        // EllipseCurve, SplineCurve, etc. → always cut
        cutPaths.push(pointsToPath(pts));
      }
    }
  }

  return {
    cutPaths,
    creasePaths,
    vb: { x: minX, y: minY, w: maxX - minX, h: maxY - minY },
  };
}

// ── component ────────────────────────────────────────────

export default function DielineDetailPage({ onBack }) {
  const { id } = useParams();
  // Catalog is a lazy chunk — resolve the template asynchronously
  const [dieline, setDieline] = useState(null);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setDieline(null);
    setNotFound(false);
    loadCatalog().then((cat) => {
      if (cancelled) return;
      const d = cat.find((x) => x.id.toString() === id);
      if (d) setDieline(d);
      else setNotFound(true);
    });
    return () => { cancelled = true; };
  }, [id]);

  const preset = useMemo(() => {
    const d = deriveDefaults(dieline);
    if (dieline?.L) { d.L = dieline.L; d.W = dieline.W; d.H = dieline.H; }
    return d;
  }, [dieline?.id]);

  const [unit, setUnit] = useState('mm');
  const [sizeMode, setSizeMode] = useState('manufacture');
  const [material, setMaterial] = useState(MATERIALS[0]);

  const [L, setL] = useState(preset.L);
  const [W, setW] = useState(preset.W);
  const [H, setH] = useState(preset.H);
  const [T, setT] = useState(preset.T);
  const [foldProgress, setFoldProgress] = useState(1); // 0 = flat, 1 = folded
  const [bleed, setBleed] = useState(3); // bleed margin in mm (adjustable 1~10)

  // Real pacdora geometry state
  const [status, setStatus] = useState('idle'); // idle | loading | real | fallback
  const [real2D, setReal2D] = useState(null);    // { cutPaths:[], creasePaths:[], vb:{} }
    const rawShapesRef = useRef(null);  // raw Pacdora shapes for bleed offset
  const classifiedRef = useRef(null); // { cutContours, creaseContours, allContours, holes, vb }

  // Original dimensions for scaling
  const origDims = useRef(null);   // { L, W, H } from pacdora when real geometry loads
  
  // SVG pan/zoom
  const [svgScale, setSvgScale] = useState(1);
  const [svgPan, setSvgPan] = useState({ x: 0, y: 0 });
  const isPanning = useRef(false);
  const panStart = useRef({ x: 0, y: 0 });
  const svgContainerRef = useRef(null);

  // 3D
  const canvasRef = useRef(null);
  const three = useRef(null);
  const paramFoldRef = useRef([]);  // parametric fold joints

  const gen = GENERATORS[preset.type] || GENERATORS['straight-tuck'];
  const paramData = useMemo(() => gen(L, W, H, T), [gen, L, W, H, T]);

  // 2D sheet scale (approximate: sheet X ~ W, sheet Y ~ L + 2H)
  const dim2D = useMemo(() => {
    if (status !== 'real' || !origDims.current) return { x: 1, y: 1 };
    const o = origDims.current;
    return {
      x: o.W ? W / o.W : 1,
      y: o.L && o.H ? (L + 2 * H) / (o.L + 2 * o.H) : 1,
    };
  }, [L, W, H, status]);

  // ---- Fetch real pacdora geometry when a card opens ----
  useEffect(() => {
    let cancelled = false;
    setReal2D(null); rawShapesRef.current = null; classifiedRef.current = null; origDims.current = null;
    setL(preset.L); setW(preset.W); setH(preset.H); setT(preset.T);

    if (!dieline?.num) { setStatus('fallback'); return; }
    setStatus('loading');
    // 8-digit nums: Pacdora stores demoProject under the 6-digit prefix.
    const fetchNum = dieline.num.length >= 8 ? dieline.num.slice(0, 6) : dieline.num;
    const tryFetch = (url) => {
      const ctrl = new AbortController();
      const timer = setTimeout(() => ctrl.abort(), 8000); // never hang forever
      return fetch(url, { signal: ctrl.signal })
        .then((r) => { if (!r.ok) throw new Error('no demo'); return r.json(); })
        .finally(() => clearTimeout(timer));
    };
    tryFetch(`https://cloud.pacdora.com/demoProject/${dieline.num}.json`)
      .catch(() => tryFetch(`https://cloud.pacdora.com/demoProject/${fetchNum}.json`))
      .then((json) => {
        if (cancelled) return;
        const scene = json.scene || json;
        const shapes = scene.shapes || [];
        if (!shapes.length) throw new Error('no shapes');

        // Classify paths into cut vs crease
        deriveUnits(shapes, dieline?.L, dieline?.W, dieline?.H);
        const classified = classifyContours(shapes);
        classifiedRef.current = classified;
        setReal2D(classified);
        rawShapesRef.current = shapes;

        // Store original dimensions for scaling
        const oL = dieline?.L || Math.round(json.totalX || classified.vb.w);
        const oW = dieline?.W || Math.round(json.totalY || classified.vb.h);
        const oH = dieline?.H || 0;
        origDims.current = { L: oL, W: oW, H: oH };

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
    // Also observe the canvas container for panel size changes
    const ro = new ResizeObserver(onResize);
    ro.observe(canvasRef.current);
    return () => { cancelAnimationFrame(raf); window.removeEventListener('resize', onResize); ro.disconnect(); obj.controls.dispose(); obj.renderer.dispose(); three.current = null; };
    // Re-run once the template resolves: the canvas mounts only after the
    // loading guard passes, so [] deps would leave the 3D scene dead.
  }, [dieline === null]);

  // Build/replace 3D content. The 3D preview is always parametric: the
  // pacdora scene JSON stores an arbitrary mid-animation pose (not a closed
  // box), so it is only used for the 2D dieline view.
  useEffect(() => {
    const obj = three.current; if (!obj) return;
    while (obj.group.children.length) obj.group.remove(obj.group.children[0]);
    const mat = new THREE.MeshPhysicalMaterial({ color: 0xdcbf94, roughness: 0.8, metalness: 0, side: THREE.DoubleSide, transparent: true, opacity: 0.96 });
    const edgeMat = new THREE.LineBasicMaterial({ color: 0x6b5636 });
    paramFoldRef.current = [];
    buildParametricFold3D(obj.group, mat, edgeMat, preset.type, L, W, H, paramFoldRef, foldProgress);
    const maxDim = Math.max(L, W, H);
    obj.cam.position.set(maxDim * 1.3, maxDim * 1.0, maxDim * 1.7);
    obj.cam.near = 0.1; obj.cam.far = maxDim * 100; obj.cam.updateProjectionMatrix();
    obj.controls.target.set(0, 0, 0); obj.controls.update();
  }, [preset.type, L, W, H, dieline?.id]);

  // Fold animation: each hinge folds within its own [start, end] slice of
  // the slider (staggered: walls, then wings, then lids). Quaternion slerp
  // avoids Euler flips and preserves the parent-child cascade.
  useEffect(() => {
    if (paramFoldRef.current.length) {
      for (const joint of paramFoldRef.current) {
        if (joint.type === 'rotate') {
          const [s, e] = joint.range || [0, 1];
          const t = Math.min(1, Math.max(0, (foldProgress - s) / (e - s)));
          const identity = new THREE.Quaternion();
          joint.node.quaternion.copy(identity).slerp(joint.closedQuaternion, t);
          joint.node.updateMatrix();
        }
      }
    }
  }, [foldProgress, status]);

  // Auto-fit SVG
  useEffect(() => {
    if (!svgContainerRef.current) return;
    const cw = svgContainerRef.current.clientWidth, ch = svgContainerRef.current.clientHeight;
    let bw, bh;
    if (status === 'real' && real2D) {
      bw = real2D.vb.w * dim2D.x;
      bh = real2D.vb.h * dim2D.y;
    } else {
      bw = paramData.width + bleed * 2; bh = paramData.height + bleed * 2;
    }
    const pad = 70;
    const fit = Math.min((cw - pad * 2) / bw, (ch - pad * 2) / bh, 3);
    setSvgScale(fit);
    const offsetX = status === 'real' && real2D ? real2D.vb.x * dim2D.x : 0;
    const offsetY = status === 'real' && real2D ? real2D.vb.y * dim2D.y : 0;
    setSvgPan({ x: (cw - bw * fit) / 2 - offsetX * fit, y: (ch - bh * fit) / 2 - offsetY * fit });
  }, [status, real2D, paramData.width, paramData.height, dim2D.x, dim2D.y, bleed]);

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

  // Catalog resolution states
  if (notFound) {
    return (
      <div className="route-loading" style={{ flexDirection: 'column', gap: '14px' }}>
        <span style={{ fontSize: '40px' }}>🔍</span>
        <span>Template not found.</span>
        <button
          onClick={onBack}
          style={{ background: 'var(--accent)', color: '#fff', border: 'none', borderRadius: '10px', padding: '10px 22px', cursor: 'pointer', fontSize: '0.9rem' }}
        >
          ← Back to templates
        </button>
      </div>
    );
  }
  if (!dieline) {
    return <div className="route-loading">⬡ Loading template…</div>;
  }

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
        <div className="flex-1 truncate px-4 text-xs text-muted hidden md-block">{dieline?.name}</div>
        <button className="btn btn-primary"><i className="fas fa-download"></i> Download the dieline</button>
      </header>

      <div className="flex h-screen-studio">
        {/* Left panel — controls */}
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
            <div className="text-10px text-muted mb-1.5">(0.3 ~ 5 mm)</div>
            <div className="ds-stepper">
              <button onClick={() => setT((v) => Math.max(0.3, +(v - 0.1).toFixed(1)))}><i className="fas fa-minus"></i></button>
              <span>{T.toFixed(1)}</span>
              <button onClick={() => setT((v) => Math.min(5, +(v + 0.1).toFixed(1)))}><i className="fas fa-plus"></i></button>
            </div>
          </div>

          <div className="ds-ctrl-group">
            <div className="ds-ctrl-label">Bleed margin</div>
            <div className="text-10px text-muted mb-1.5">(1 ~ 10 mm)</div>
            <div className="ds-stepper">
              <button onClick={() => setBleed((v) => Math.max(1, +(v - 0.5).toFixed(1)))}><i className="fas fa-minus"></i></button>
              <span>{bleed.toFixed(1)} mm</span>
              <button onClick={() => setBleed((v) => Math.min(10, +(v + 0.5).toFixed(1)))}><i className="fas fa-plus"></i></button>
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

        {/* Center — 2D Dieline (always visible) */}
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

          <div
            className="ds-svg-container"
            ref={svgContainerRef}
            onWheel={onWheel} onMouseDown={onDown} onMouseMove={onMove} onMouseUp={onUp} onMouseLeave={onUp}
          >
            <div className="ds-svg-overlay">
              <button className="btn" onClick={() => setSvgScale((s) => s * 1.3)}><i className="fas fa-plus"></i></button>
              <button className="btn" onClick={() => setSvgScale((s) => Math.max(0.05, s / 1.3))}><i className="fas fa-minus"></i></button>
            </div>
            <div className="ds-info-bar">
              <span>{isReal ? 'Real dieline geometry' : (status === 'loading' ? 'Loading…' : 'Parametric dieline')}</span>
              <span>Sheet: {isReal ? `${(real2D.vb.w * dim2D.x).toFixed(0)} × ${(real2D.vb.h * dim2D.y).toFixed(0)}` : `${paramData.width.toFixed(0)} × ${paramData.height.toFixed(0)}`} mm</span>
            </div>
            {status === 'loading' && <div className="ds-loading"><i className="fas fa-circle-notch fa-spin"></i> Fetching real pacdora structure…</div>}
            <svg width="100%" height="100%">
              <g transform={`translate(${svgPan.x},${svgPan.y}) scale(${svgScale})`}>
                {isReal ? (
                  <>
                    {/* Apply dim scale to real paths */}
                    <g transform={`translate(${real2D.vb.x},${real2D.vb.y}) scale(${dim2D.x},${dim2D.y}) translate(${-real2D.vb.x},${-real2D.vb.y})`}>
                      {/* Bleed line (green) — Clipper2 offset of all contours + holes */}
                      {(() => {
                        if (!rawShapesRef.current) return null;
                        const bleedD = computeBleedOffset(rawShapesRef.current, bleed);
                        return bleedD ? <path d={bleedD} fill="none" stroke="var(--bleed)" strokeWidth={1.0 / (svgScale * Math.max(dim2D.x, dim2D.y))} /> : null;
                      })()}
                      {/* Crease lines (red, dashed) — continuous contours */}
                      {(real2D.creaseContours || []).map((d, i) => (
                        <path key={`cr-${i}`} d={d} fill="none" stroke="var(--crease)" strokeWidth={0.9 / (svgScale * Math.max(dim2D.x, dim2D.y))} strokeDasharray={`${4 / (svgScale * Math.max(dim2D.x, dim2D.y))},${3 / (svgScale * Math.max(dim2D.x, dim2D.y))}`} />
                      ))}
                      {/* Trim / cut lines (blue, solid) — continuous contours */}
                      {(real2D.cutContours || []).map((d, i) => (
                        <path key={`ct-${i}`} d={d} fill="none" stroke="var(--cut)" strokeWidth={1.3 / (svgScale * Math.max(dim2D.x, dim2D.y))} shapeRendering="geometricPrecision" />
                      ))}
                    </g>
                  </>
                ) : (
                  <>
                    {/* Bleed line (green) — Clipper2 offset of parametric cut paths */}
                    {(() => {
                      const bleedD = computeBleedOffsetFromSVG(paramData.regions || paramData.cut, bleed, paramData.holes || []);
                      return bleedD ? <path d={bleedD} fill="none" stroke="var(--bleed)" strokeWidth={1.0 / svgScale} /> : null;
                    })()}

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
        </div>

        {/* Right panel — 3D Preview + file formats */}
        <aside className="ds-right-panel ds-right-panel-3d">
          <div className="ds-ctrl-label mt-3 mb-1.5">3D Preview</div>
          <div className="ds-3d-canvas-wrap">
            <canvas ref={canvasRef} className="w-full h-full block" />
            <div className="ds-info-bar ds-3d-info">
              <span><i className="fas fa-mouse-pointer text-10px"></i> Drag to rotate · Scroll to zoom</span>
              <span>Parametric 3D — folded from your dimensions</span>
            </div>
          </div>
          <div className="ds-seekbar-wrap">
            <span className="ds-seek-icon" onClick={() => setFoldProgress(0)} title="Unfold (flat)">
              <i className="fas fa-expand-arrows-alt"></i>
            </span>
            <input
              type="range"
              className="ds-seekbar"
              min={0}
              max={1}
              step={0.01}
              value={foldProgress}
              onChange={(e) => setFoldProgress(+e.target.value)}
            />
            <span className="ds-seek-icon" onClick={() => setFoldProgress(1)} title="Fold (closed)">
              <i className="fas fa-compress-arrows-alt"></i>
            </span>
          </div>

          <div className="ds-ctrl-label mt-3">File formats</div>
          <div className="ds-format-grid2">
            <div className="ds-fmt-card"><i className="fab fa-adobe"></i> AI dieline</div>
            <div className="ds-fmt-card"><i className="fas fa-file-pdf"></i> PDF dieline</div>
            <div className="ds-fmt-card"><i className="fas fa-vector-square"></i> DXF dieline</div>
            <div className="ds-fmt-card"><i className="fas fa-image"></i> 3D mockup</div>
          </div>
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

// ---- Parametric 3D with fold animation ----
// foldProgress 0 = flat dieline net lying on the ground, 1 = fully closed box.
// Every panel starts lying flat and is parented to a hinge Group at its real
// fold line; the closed quaternion rotates it (cascading through parent
// hinges) into its folded position, so the animation follows the dieline.
function buildParametricFold3D(group, mat, edgeMat, type, L, W, H, foldRef, foldProgress) {
  const hw = W / 2, hl = L / 2;
  const Q = Math.PI / 2;
  foldRef.current = [];

  const makePanel = (w, h) => {
    const geo = new THREE.PlaneGeometry(w, h);
    const mesh = new THREE.Mesh(geo, mat);
    const line = new THREE.LineSegments(new THREE.EdgesGeometry(geo), edgeMat);
    return { mesh, line };
  };

  // A panel lying flat on the ground (normal +Y), extending `h` along dir
  const flatPanel = (w, h, dir) => {
    const { mesh, line } = makePanel(w, h);
    if (dir === '+z') { mesh.rotation.x = Q; mesh.position.set(0, 0, h / 2); }
    else if (dir === '-z') { mesh.rotation.x = -Q; mesh.position.set(0, 0, -h / 2); }
    else if (dir === '+x') {
      // basis: local X(width) -> world Z, local Y(height) -> world +X, normal -> +Y
      mesh.quaternion.setFromRotationMatrix(new THREE.Matrix4().makeBasis(
        new THREE.Vector3(0, 0, 1), new THREE.Vector3(1, 0, 0), new THREE.Vector3(0, 1, 0)
      ));
      mesh.position.set(h / 2, 0, 0);
    } else {
      mesh.quaternion.setFromRotationMatrix(new THREE.Matrix4().makeBasis(
        new THREE.Vector3(0, 0, 1), new THREE.Vector3(-1, 0, 0), new THREE.Vector3(0, -1, 0)
      ));
      mesh.position.set(-h / 2, 0, 0);
    }
    line.rotation.copy(mesh.rotation);
    line.position.copy(mesh.position);
    return { mesh, line };
  };

  // Hinge group at pos holding a flat panel; closedEuler = folded rotation.
  // range = [start, end] slice of foldProgress over which this joint folds
  // (staggered folding: walls first, then wings, then lids — like a real box).
  const addHinge = (parent, pos, w, h, dir, closedEuler, range = [0, 1]) => {
    const hinge = new THREE.Group();
    hinge.position.copy(pos);
    const { mesh, line } = flatPanel(w, h, dir);
    hinge.add(mesh);
    hinge.add(line);
    parent.add(hinge);
    const closedQ = new THREE.Quaternion().setFromEuler(
      new THREE.Euler(closedEuler[0], closedEuler[1], closedEuler[2])
    );
    foldRef.current.push({ type: 'rotate', node: hinge, closedQuaternion: closedQ, range });
    const t = Math.min(1, Math.max(0, (foldProgress - range[0]) / (range[1] - range[0])));
    hinge.quaternion.copy(new THREE.Quaternion()).slerp(closedQ, t);
    return hinge;
  };

  const addBase = () => {
    const base = makePanel(W, L);
    base.mesh.rotation.set(-Q, 0, 0);
    base.line.rotation.copy(base.mesh.rotation);
    group.add(base.mesh);
    group.add(base.line);
  };

  // Four walls hinged to the base edges: lying flat at 0, standing at 1
  const WALL_RANGE = [0, 0.6];
  const addWalls = () => {
    const front = addHinge(group, new THREE.Vector3(0, 0, hl), W, H, '+z', [-Q, 0, 0], WALL_RANGE);
    const back = addHinge(group, new THREE.Vector3(0, 0, -hl), W, H, '-z', [Q, 0, 0], WALL_RANGE);
    const left = addHinge(group, new THREE.Vector3(-hw, 0, 0), L, H, '-x', [0, 0, -Q], WALL_RANGE);
    const right = addHinge(group, new THREE.Vector3(hw, 0, 0), L, H, '+x', [0, 0, Q], WALL_RANGE);
    return { front, back, left, right };
  };

  // Wings on the side walls folding inward over the opening
  const addDustFlaps = (walls) => {
    const depth = Math.max(W / 2 - 1, 4);
    // flatPanel(w, h, dir): w runs along the hinge (Z), h extends along dir —
    // so the flap extends `depth` inward with width L, NOT L inward.
    addHinge(walls.right, new THREE.Vector3(H, 0, 0), L, depth, '+x', [0, 0, Q], [0.55, 0.85]);
    addHinge(walls.left, new THREE.Vector3(-H, 0, 0), L, depth, '-x', [0, 0, -Q], [0.55, 0.85]);
  };

  const TUCK_OVER = Math.PI + 0.35;   // folds past vertical: tucked inside
  const tuckCarton = (topSide, bottomTuck) => {
    addBase();
    const walls = addWalls();
    addDustFlaps(walls);
    if (topSide === 'front') {
      addHinge(walls.front, new THREE.Vector3(0, 0, H), W, L / 2, '+z', [TUCK_OVER, 0, 0], [0.7, 1]);
    } else if (topSide === 'back') {
      addHinge(walls.back, new THREE.Vector3(0, 0, -H), W, L / 2, '-z', [-(Math.PI + 0.35), 0, 0], [0.7, 1]);
    }
    if (bottomTuck) {
      addHinge(walls.front, new THREE.Vector3(0, 0, 0), W, L / 2, '+z', [-Q, 0, 0], [0.6, 0.9]);
    }
  };

  if (type === 'straight-tuck' || type === 'window' || type === 'hanger') {
    tuckCarton('front', true);
  } else if (type === 'reverse-tuck') {
    tuckCarton('back', true);
  } else if (type === 'auto-lock') {
    tuckCarton('front', false); // crash-lock base stays glued shut
  } else if (type === 'mailer') {
    // Hinged-lid mailer: lid folds forward from the back wall, lip down the front
    addBase();
    const walls = addWalls();
    addDustFlaps(walls);
    const lidHinge = addHinge(walls.back, new THREE.Vector3(0, 0, -H), W, L, '-z', [Q, 0, 0], [0.7, 0.95]);
    addHinge(lidHinge, new THREE.Vector3(0, 0, -L), W, H, '-z', [Q, 0, 0], [0.9, 1]);
  } else if (type === 'tray') {
    // Open tray: base + four walls
    addBase();
    addWalls();
  } else if (type === 'two-piece') {
    // Base tray + separate lid tray floating above
    addBase();
    addWalls();
    const lidH = Math.max(H * 0.4, 20);
    const lid = new THREE.Group();
    lid.position.set(0, H + lidH + 8, 0);
    group.add(lid);
    const lidBase = makePanel(W, L);
    lidBase.mesh.rotation.set(-Q, 0, 0);
    lidBase.line.rotation.copy(lidBase.mesh.rotation);
    lid.add(lidBase.mesh);
    lid.add(lidBase.line);
    const lidWalls = [
      [W, [0, hl], 0],
      [W, [0, -hl], 0],
      [L, [-hw, 0], Q],
      [L, [hw, 0], -Q],
    ];
    for (const [w, [px, pz], rY] of lidWalls) {
      const { mesh, line } = makePanel(w, lidH);
      mesh.rotation.y = rY;
      mesh.position.set(px, lidH / 2, pz);
      line.rotation.copy(mesh.rotation);
      line.position.copy(mesh.position);
      lid.add(mesh);
      lid.add(line);
    }
  } else if (type === 'gable') {
    // Base + walls + roof panels meeting at a ridge along X
    addBase();
    const walls = addWalls();
    const rise = Math.max(H * 0.45, 18);
    const roofLen = Math.hypot(hl, rise);
    addHinge(walls.front, new THREE.Vector3(0, 0, H), W, roofLen, '+z', [-Math.atan2(hl, rise), 0, 0], [0.65, 1]);
    addHinge(walls.back, new THREE.Vector3(0, 0, -H), W, roofLen, '-z', [Math.atan2(hl, rise), 0, 0], [0.65, 1]);
  } else if (type === 'sleeve') {
    // Rectangular tube: 4 panels chained by vertical fold lines (no base/lid)
    const p1 = flatPanel(W, H, '+z');
    group.add(p1.mesh);
    group.add(p1.line);
    let parent = group;
    let edgeX = W / 2;
    const sleeveRanges = [[0, 0.5], [0.2, 0.7], [0.45, 1]];
    let si = 0;
    for (const w of [L, W, L]) {
      const hinge = new THREE.Group();
      hinge.position.set(edgeX, 0, H / 2);
      parent.add(hinge);
      const { mesh, line } = flatPanel(w, H, '+x');
      hinge.add(mesh);
      hinge.add(line);
      const range = sleeveRanges[si++];
      const closedQ = new THREE.Quaternion().setFromEuler(new THREE.Euler(0, 0, Q));
      foldRef.current.push({ type: 'rotate', node: hinge, closedQuaternion: closedQ, range });
      const t = Math.min(1, Math.max(0, (foldProgress - range[0]) / (range[1] - range[0])));
      hinge.quaternion.copy(new THREE.Quaternion()).slerp(closedQ, t);
      parent = hinge;
      edgeX = H;
    }
  } else if (type === 'hexagonal') {
    // Hexagonal base + 6 walls; alignment group keeps each wall's edge angle
    const R = Math.max(W, L) / 2, n = 6;
    const base = makePanel(W, L);
    base.mesh.rotation.set(-Q, 0, 0);
    base.line.rotation.copy(base.mesh.rotation);
    group.add(base.mesh);
    group.add(base.line);
    for (let i = 0; i < n; i++) {
      const a0 = (i / n) * Math.PI * 2, a1 = ((i + 1) / n) * Math.PI * 2;
      const x0 = Math.cos(a0) * R, z0 = Math.sin(a0) * R;
      const x1 = Math.cos(a1) * R, z1 = Math.sin(a1) * R;
      const side = Math.hypot(x1 - x0, z1 - z0);
      const midX = (x0 + x1) / 2, midZ = (z0 + z1) / 2;
      const ang = Math.atan2(z1 - z0, x1 - x0);
      const align = new THREE.Group();
      align.position.set(midX, 0, midZ);
      align.rotation.y = -ang + Q;
      group.add(align);
      addHinge(align, new THREE.Vector3(0, 0, 0), side, H, '+z', [-Q, 0, 0], WALL_RANGE);
    }
  } else if (type === 'pillow') {
    const geo = new THREE.CylinderGeometry(H / 2, H / 2, W, 24);
    const mesh = new THREE.Mesh(geo, mat);
    mesh.scale.set(1, 1, 0.55);
    mesh.rotation.z = Math.PI / 2;
    group.add(mesh);
  } else {
    // Generic lidded box fallback
    addBase();
    const walls = addWalls();
    addHinge(walls.back, new THREE.Vector3(0, 0, -H), W, L, '-z', [Q, 0, 0], [0.7, 1]);
  }
}
