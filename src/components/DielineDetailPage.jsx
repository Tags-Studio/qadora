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

export default function DielineDetailPage({ dieline, onBack }) {
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
  const realSceneJSON = useRef(null);

  // Original dimensions for scaling
  const origDims = useRef(null);   // { L, W, H } from pacdora when real geometry loads
  const orig3DSize = useRef(null);  // bounding box of loaded 3D model

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
  const foldJointsRef = useRef([]); // template-specific hinge quaternions from pacdora hierarchy
  const paramFoldRef = useRef([]);  // parametric fold joints for fallback mode

  const gen = GENERATORS[preset.type] || GENERATORS['straight-tuck'];
  const paramData = useMemo(() => gen(L, W, H, T), [gen, L, W, H, T]);

  // Dimension scale factors (real mode only)
  const dimScale = useMemo(() => {
    if (status !== 'real' || !origDims.current) return { x: 1, y: 1, z: 1 };
    const o = origDims.current;
    return {
      x: o.L ? L / o.L : 1,
      y: o.H ? H / o.H : 1,
      z: o.W ? W / o.W : 1,
    };
  }, [L, W, H, status]);

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
    setReal2D(null); realSceneJSON.current = null; origDims.current = null; orig3DSize.current = null;
    setL(preset.L); setW(preset.W); setH(preset.H); setT(preset.T);

    if (!dieline?.num) { setStatus('fallback'); return; }
    setStatus('loading');
    // 8-digit nums: Pacdora stores demoProject under the 6-digit prefix.
    const fetchNum = dieline.num.length >= 8 ? dieline.num.slice(0, 6) : dieline.num;
    const tryFetch = (url) => fetch(url)
      .then((r) => { if (!r.ok) throw new Error('no demo'); return r.json(); });
    tryFetch(`https://cloud.pacdora.com/demoProject/${dieline.num}.json`)
      .catch(() => tryFetch(`https://cloud.pacdora.com/demoProject/${fetchNum}.json`))
      .then((json) => {
        if (cancelled) return;
        const scene = json.scene || json;
        const shapes = scene.shapes || [];
        if (!shapes.length) throw new Error('no shapes');

        // Classify paths into cut vs crease
        const classified = classifyRealPaths(shapes);
        setReal2D(classified);
        realSceneJSON.current = scene;

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
    return () => { cancelAnimationFrame(raf); window.removeEventListener('resize', onResize); ro.disconnect(); obj.renderer.dispose(); three.current = null; };
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
    orig3DSize.current = null;

    if (status === 'real' && realSceneJSON.current) {
      try {
        const loader = new THREE.ObjectLoader();
        loader.parse(realSceneJSON.current, (loaded) => {
          if (!three.current) return;
          obj.group.add(loaded);
          realObjRef.current = loaded;
          // Pacdora encodes each template's folding mechanism in nested hinge
          // meshes named like H_FB, FB_F, F_FT, etc. Panel meshes themselves
          // stay identity-rotated; the hinge quaternions carry the real motion.
          foldJointsRef.current = [];
          const identity = new THREE.Quaternion();
          loaded.traverse((child) => {
            if (child.isMesh && child.name.includes('_')) {
              const closedQuaternion = child.quaternion.clone();
              foldJointsRef.current.push({ node: child, closedQuaternion });
              child.quaternion.copy(identity).slerp(closedQuaternion, foldProgress);
            }
          });
          const size = frameObject(loaded);
          orig3DSize.current = size ? { x: size.x, y: size.y, z: size.z } : null;
          // Apply current dim scale
          if (orig3DSize.current) {
            loaded.scale.set(dimScale.x, dimScale.y, dimScale.z);
          }
          if (!dieline?.L && size) {
            setL(Math.round(size.x)); setH(Math.round(size.y)); setW(Math.round(size.z));
          }
        });
      } catch (e) { /* fall through to parametric */ }
    } else if (status === 'fallback') {
      const mat = new THREE.MeshPhysicalMaterial({ color: 0xdcbf94, roughness: 0.8, metalness: 0, side: THREE.DoubleSide, transparent: true, opacity: 0.96 });
      const edgeMat = new THREE.LineBasicMaterial({ color: 0x6b5636 });
      paramFoldRef.current = [];
      buildParametricFold3D(obj.group, mat, edgeMat, preset.type, L, W, H, paramFoldRef, foldProgress);
      const maxDim = Math.max(L, W, H);
      obj.cam.position.set(maxDim * 1.3, maxDim * 1.0, maxDim * 1.7);
      obj.cam.near = 0.1; obj.cam.far = maxDim * 100; obj.cam.updateProjectionMatrix();
      obj.controls.target.set(0, 0, 0); obj.controls.update();
    }
  }, [status, dieline?.id]);

  // Scale 3D model when dims change (real mode only)
  useEffect(() => {
    if (status !== 'real' || !realObjRef.current) return;
    realObjRef.current.scale.set(dimScale.x, dimScale.y, dimScale.z);
    // Re-frame after scale change
    const obj = three.current; if (!obj || !orig3DSize.current) return;
    const maxDim = Math.max(
      orig3DSize.current.x * dimScale.x,
      orig3DSize.current.y * dimScale.y,
      orig3DSize.current.z * dimScale.z
    ) || 100;
    obj.cam.position.set(maxDim * 1.3, maxDim * 1.0, maxDim * 1.7);
    obj.cam.near = maxDim / 100; obj.cam.far = maxDim * 100; obj.cam.updateProjectionMatrix();
    obj.controls.target.set(0, 0, 0); obj.controls.update();
  }, [dimScale, status]);

  // Fold animation: use every template's own nested hinge quaternions.
  // Quaternion slerp avoids Euler flips and preserves the parent-child cascade.
  // Also handles parametric fallback fold animation.
  useEffect(() => {
    if (status === 'real' && realObjRef.current) {
      const identity = new THREE.Quaternion();
      for (const { node, closedQuaternion } of foldJointsRef.current) {
        node.quaternion.copy(identity).slerp(closedQuaternion, foldProgress);
        node.updateMatrix();
      }
    } else if (status === 'fallback' && paramFoldRef.current.length) {
      for (const joint of paramFoldRef.current) {
        if (joint.type === 'rotate') {
          const identity = new THREE.Quaternion();
          joint.node.quaternion.copy(identity).slerp(joint.closedQuaternion, foldProgress);
          joint.node.updateMatrix();
        }
      }
    }
  }, [foldProgress, status]);

  // Rebuild parametric 3D when dims change (fallback mode only)
  useEffect(() => {
    const obj = three.current; if (!obj || status !== 'fallback') return;
    while (obj.group.children.length) obj.group.remove(obj.group.children[0]);
    const mat = new THREE.MeshPhysicalMaterial({ color: 0xdcbf94, roughness: 0.8, metalness: 0, side: THREE.DoubleSide, transparent: true, opacity: 0.96 });
    const edgeMat = new THREE.LineBasicMaterial({ color: 0x6b5636 });
    paramFoldRef.current = [];
    buildParametricFold3D(obj.group, mat, edgeMat, preset.type, L, W, H, paramFoldRef, foldProgress);
  }, [L, W, H, status, preset.type]);

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
            <div className="text-[10px] text-muted mb-1.5">(0.3 ~ 5 mm)</div>
            <div className="ds-stepper">
              <button onClick={() => setT((v) => Math.max(0.3, +(v - 0.1).toFixed(1)))}><i className="fas fa-minus"></i></button>
              <span>{T.toFixed(1)}</span>
              <button onClick={() => setT((v) => Math.min(5, +(v + 0.1).toFixed(1)))}><i className="fas fa-plus"></i></button>
            </div>
          </div>

          <div className="ds-ctrl-group">
            <div className="ds-ctrl-label">Bleed margin</div>
            <div className="text-[10px] text-muted mb-1.5">(1 ~ 10 mm)</div>
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
                    {/* Bleed outline (green) — dilated cut paths */}
                    {/* Apply dim scale to real paths */}
                    <g transform={`translate(${real2D.vb.x},${real2D.vb.y}) scale(${dim2D.x},${dim2D.y}) translate(${-real2D.vb.x},${-real2D.vb.y})`}>
                      {/* Bleed — thin green ring at 3mm outside trim (dilation filter) */}
                      <defs>
                        <filter id="bleedDilateReal" x="-30%" y="-30%" width="160%" height="160%">
                          <feMorphology operator="dilate" radius={bleed + 0.08} in="SourceGraphic" result="dil1" />
                          <feMorphology operator="dilate" radius={bleed - 0.08} in="SourceGraphic" result="dil2" />
                          <feComposite in="dil1" in2="dil2" operator="out" result="ring" />
                          <feFlood floodColor="#2eae3a" floodOpacity="1" result="col" />
                          <feComposite in="col" in2="ring" operator="in" result="bleed" />
                        </filter>
                      </defs>
                      <g filter="url(#bleedDilateReal)">
                        {real2D.cutPaths.map((d, i) => (
                          <path key={`b-${i}`} d={d} fill="none" stroke="#000" strokeWidth={0.1} />
                        ))}
                      </g>
                      {/* Crease lines (red, dashed) */}
                      {real2D.creasePaths.map((d, i) => (
                        <path key={`cr-${i}`} d={d} fill="none" stroke="var(--crease)" strokeWidth={0.9 / (svgScale * Math.max(dim2D.x, dim2D.y))} strokeDasharray={`${4 / (svgScale * Math.max(dim2D.x, dim2D.y))},${3 / (svgScale * Math.max(dim2D.x, dim2D.y))}`} />
                      ))}
                      {/* Trim / cut lines (blue, solid) */}
                      {real2D.cutPaths.map((d, i) => (
                        <path key={`ct-${i}`} d={d} fill="none" stroke="var(--cut)" strokeWidth={1.3 / (svgScale * Math.max(dim2D.x, dim2D.y))} shapeRendering="geometricPrecision" />
                      ))}
                    </g>
                  </>
                ) : (
                  <>
                    <defs>
                      <filter id="bleedDilate" x="-30%" y="-30%" width="160%" height="160%">
                        <feMorphology operator="dilate" radius={bleed + 0.08} in="SourceGraphic" result="dil1" />
                        <feMorphology operator="dilate" radius={bleed - 0.08} in="SourceGraphic" result="dil2" />
                        <feComposite in="dil1" in2="dil2" operator="out" result="ring" />
                        <feFlood floodColor="#2eae3a" floodOpacity="1" result="col" />
                        <feComposite in="col" in2="ring" operator="in" result="bleed" />
                      </filter>
                    </defs>
                    <g filter="url(#bleedDilate)">
                      {paramData.cut.map((d, i) => <path key={`b-${i}`} d={d} fill="none" stroke="#000" strokeWidth={0.1} />)}
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
        </div>

        {/* Right panel — 3D Preview + file formats */}
        <aside className="ds-right-panel ds-right-panel-3d">
          <div className="ds-ctrl-label mt-3 mb-1.5">3D Preview</div>
          <div className="ds-3d-canvas-wrap">
            <canvas ref={canvasRef} className="w-full h-full block" />
            <div className="ds-info-bar ds-3d-info">
              <span><i className="fas fa-mouse-pointer text-[10px]"></i> Drag to rotate · Scroll to zoom</span>
              <span>{isReal ? 'Real 3D model' : 'Parametric 3D'}</span>
            </div>
          </div>
          {(isReal || status === 'fallback') && (
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
          )}

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
// Builds a flat unfolded net at foldProgress=0 and a closed box at foldProgress=1.
// Each wall panel is parented to a hinge Group at its fold edge; rotating the
// hinge folds the panel (and any children) into the final 3D shape.
function buildParametricFold3D(group, mat, edgeMat, type, L, W, H, foldRef, foldProgress) {
  const hw = W / 2, hl = L / 2, hh = H / 2;
  const shape = TYPE_TO_SHAPE[type] || 'closed';
  foldRef.current = [];

  const makePanel = (w, h) => {
    const geo = new THREE.PlaneGeometry(w, h);
    const mesh = new THREE.Mesh(geo, mat);
    const line = new THREE.LineSegments(new THREE.EdgesGeometry(geo), edgeMat);
    return { mesh, line };
  };

  // Create a hinge group at hingePos with a panel offset from it.
  // foldAngle is the rotation around X to reach the closed position.
  const addHingePanel = (w, h, hingePos, panelOffset, foldAngle) => {
    const hinge = new THREE.Group();
    hinge.position.copy(hingePos);
    const { mesh, line } = makePanel(w, h);
    mesh.position.copy(panelOffset);
    line.position.copy(panelOffset);
    hinge.add(mesh);
    hinge.add(line);
    group.add(hinge);
    const closedQ = new THREE.Quaternion();
    closedQ.setFromEuler(new THREE.Euler(foldAngle, 0, 0));
    foldRef.current.push({ type: 'rotate', node: hinge, closedQuaternion: closedQ });
    const identity = new THREE.Quaternion();
    hinge.quaternion.copy(identity).slerp(closedQ, foldProgress);
    return hinge;
  };

  if (shape === 'sleeve' || shape === 'tray' || shape === 'closed' || shape === 'window' || shape === 'hanger' || shape === 'auto-lock' || shape === 'two-piece') {
    // Base panel (bottom) - lies flat
    const base = makePanel(W, L);
    base.mesh.rotation.set(-Math.PI / 2, 0, 0);
    base.line.rotation.copy(base.mesh.rotation);
    group.add(base.mesh);
    group.add(base.line);

    // Four walls hinged to base edges, folding up 90 degrees
    addHingePanel(W, H, new THREE.Vector3(0, 0, hl), new THREE.Vector3(0, H / 2, 0), -Math.PI / 2);
    addHingePanel(W, H, new THREE.Vector3(0, 0, -hl), new THREE.Vector3(0, H / 2, 0), Math.PI / 2);
    addHingePanel(L, H, new THREE.Vector3(-hw, 0, 0), new THREE.Vector3(0, H / 2, 0), Math.PI / 2);
    addHingePanel(L, H, new THREE.Vector3(hw, 0, 0), new THREE.Vector3(0, H / 2, 0), -Math.PI / 2);

    if (shape === 'closed' || shape === 'auto-lock') {
      // Top lid hinged to front wall top edge, folds over
      const lidHinge = new THREE.Group();
      lidHinge.position.set(0, H, hl);
      const { mesh: lidMesh, line: lidLine } = makePanel(W, L);
      lidMesh.position.set(0, 0, -L / 2);
      lidLine.position.copy(lidMesh.position);
      lidHinge.add(lidMesh);
      lidHinge.add(lidLine);
      group.add(lidHinge);
      const lidQ = new THREE.Quaternion();
      lidQ.setFromEuler(new THREE.Euler(Math.PI / 2, 0, 0));
      foldRef.current.push({ type: 'rotate', node: lidHinge, closedQuaternion: lidQ });
      lidHinge.quaternion.copy(new THREE.Quaternion()).slerp(lidQ, foldProgress);
    }

    if (shape === 'two-piece') {
      // Separate telescope lid
      const lidH = Math.max(H * 0.4, 20);
      const lidGroup = new THREE.Group();
      lidGroup.position.set(0, H + lidH / 2, 0);
      const lidBase = makePanel(W, L);
      lidBase.mesh.rotation.set(-Math.PI / 2, 0, 0);
      lidBase.line.rotation.copy(lidBase.mesh.rotation);
      lidGroup.add(lidBase.mesh);
      lidGroup.add(lidBase.line);
      const lidWalls = [
        [W, lidH, 0, 0, hl, -Math.PI / 2, 0, 0],
        [W, lidH, 0, 0, -hl, Math.PI / 2, 0, 0],
        [L, lidH, -hw, 0, 0, 0, -Math.PI / 2, 0],
        [L, lidH, hw, 0, 0, 0, Math.PI / 2, 0],
      ];
      for (const [w, h, px, py, pz, rx, ry, rz] of lidWalls) {
        const { mesh: wm, line: wl } = makePanel(w, h);
        wm.position.set(px, py, pz); wm.rotation.set(rx, ry, rz);
        wl.position.copy(wm.position); wl.rotation.copy(wm.rotation);
        lidGroup.add(wm);
        lidGroup.add(wl);
      }
      group.add(lidGroup);
    }
  } else if (shape === 'gable') {
    const base = makePanel(W, L);
    base.mesh.rotation.set(-Math.PI / 2, 0, 0);
    base.line.rotation.copy(base.mesh.rotation);
    group.add(base.mesh);
    group.add(base.line);
    addHingePanel(W, H, new THREE.Vector3(0, 0, hl), new THREE.Vector3(0, H / 2, 0), -Math.PI / 2);
    addHingePanel(W, H, new THREE.Vector3(0, 0, -hl), new THREE.Vector3(0, H / 2, 0), Math.PI / 2);
    addHingePanel(L, H, new THREE.Vector3(-hw, 0, 0), new THREE.Vector3(0, H / 2, 0), Math.PI / 2);
    addHingePanel(L, H, new THREE.Vector3(hw, 0, 0), new THREE.Vector3(0, H / 2, 0), -Math.PI / 2);
    // Gable roof
    const rise = Math.max(H * 0.45, 18);
    const roofLen = Math.hypot(hl, rise);
    const roofAngle = Math.atan2(rise, hl);
    const leftRoof = new THREE.Group();
    leftRoof.position.set(0, H, 0);
    const { mesh: lrm, line: lrl } = makePanel(W, roofLen);
    lrm.position.set(0, 0, -roofLen / 2);
    lrl.position.copy(lrm.position);
    leftRoof.add(lrm);
    leftRoof.add(lrl);
    group.add(leftRoof);
    const lrq = new THREE.Quaternion();
    lrq.setFromEuler(new THREE.Euler(-roofAngle, 0, 0));
    foldRef.current.push({ type: 'rotate', node: leftRoof, closedQuaternion: lrq });
    leftRoof.quaternion.copy(new THREE.Quaternion()).slerp(lrq, foldProgress);
    const rightRoof = new THREE.Group();
    rightRoof.position.set(0, H, 0);
    const { mesh: rrm, line: rrl } = makePanel(W, roofLen);
    rrm.position.set(0, 0, roofLen / 2);
    rrl.position.copy(rrm.position);
    rightRoof.add(rrm);
    rightRoof.add(rrl);
    group.add(rightRoof);
    const rrq = new THREE.Quaternion();
    rrq.setFromEuler(new THREE.Euler(roofAngle, 0, 0));
    foldRef.current.push({ type: 'rotate', node: rightRoof, closedQuaternion: rrq });
    rightRoof.quaternion.copy(new THREE.Quaternion()).slerp(rrq, foldProgress);
  } else if (shape === 'hexagonal') {
    const base = makePanel(W, L);
    base.mesh.rotation.set(-Math.PI / 2, 0, 0);
    base.line.rotation.copy(base.mesh.rotation);
    group.add(base.mesh);
    group.add(base.line);
    const R = Math.max(W, L) / 2, n = 6;
    for (let i = 0; i < n; i++) {
      const a0 = (i / n) * Math.PI * 2, a1 = ((i + 1) / n) * Math.PI * 2;
      const x0 = Math.cos(a0) * R, z0 = Math.sin(a0) * R;
      const x1 = Math.cos(a1) * R, z1 = Math.sin(a1) * R;
      const side = Math.hypot(x1 - x0, z1 - z0);
      const midX = (x0 + x1) / 2, midZ = (z0 + z1) / 2;
      const ang = Math.atan2(z1 - z0, x1 - x0);
      const hinge = new THREE.Group();
      hinge.position.set(midX, 0, midZ);
      hinge.rotation.y = -ang + Math.PI / 2;
      const { mesh, line } = makePanel(side, H);
      mesh.position.set(0, H / 2, 0);
      line.position.copy(mesh.position);
      hinge.add(mesh);
      hinge.add(line);
      group.add(hinge);
      const closedQ = new THREE.Quaternion();
      closedQ.setFromEuler(new THREE.Euler(-Math.PI / 2, 0, 0));
      foldRef.current.push({ type: 'rotate', node: hinge, closedQuaternion: closedQ });
      hinge.quaternion.copy(new THREE.Quaternion()).slerp(closedQ, foldProgress);
    }
  } else if (shape === 'pillow') {
    const geo = new THREE.CylinderGeometry(H / 2, H / 2, W, 24);
    const mesh = new THREE.Mesh(geo, mat);
    mesh.scale.set(1, 1, 0.55);
    mesh.rotation.z = Math.PI / 2;
    group.add(mesh);
  }
}
