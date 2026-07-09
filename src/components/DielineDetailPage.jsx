import React, { useState, useEffect, useRef } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import { BOX_TYPES, GENERATORS, resolveTypeForDieline } from '../utils/dielineGenerators';
import './DielineDetailPage.css';

export default function DielineDetailPage({ dieline, onBack }) {
  // Resolve the dedicated generator type from the card's category/name
  const allBoxes = BOX_TYPES.flatMap(c => c.items);
  const initialType = resolveTypeForDieline(dieline);

  // --- State ---
  const [currentType, setCurrentType] = useState(initialType);
  const [activeTab, setActiveTab] = useState('dieline'); // 'dieline' or 'preview'
  const [showArchModal, setShowArchModal] = useState(false);
  const [showDimensions, setShowDimensions] = useState(true);
  const [showBleed, setShowBleed] = useState(true);
  
  // Dimensions
  const [L, setL] = useState(200);
  const [W, setW] = useState(150);
  const [H, setH] = useState(100);
  const [T, setT] = useState(1.5);

  // SVG Panning / Zooming
  const [svgScale, setSvgScale] = useState(1);
  const [svgPan, setSvgPan] = useState({ x: 0, y: 0 });
  const isPanning = useRef(false);
  const panStart = useRef({ x: 0, y: 0 });
  const svgContainerRef = useRef(null);

  // 3D Refs
  const miniCanvasRef = useRef(null);
  const fullCanvasRef = useRef(null);
  const miniSceneRef = useRef(null);
  const fullSceneRef = useRef(null);

  const typeInfo = allBoxes.find(t => t.id === currentType) || allBoxes[0];
  const BLEED = 3;

  // --- 2D Dieline Logic ---
  const gen = GENERATORS[currentType];
  const dielineData = gen ? gen(L, W, H, T) : null;

  // Auto-fit SVG on data change or initial render
  useEffect(() => {
    if (!dielineData || !svgContainerRef.current) return;
    const cw = svgContainerRef.current.clientWidth;
    const ch = svgContainerRef.current.clientHeight;
    const bw = dielineData.width + BLEED * 2;
    const bh = dielineData.height + BLEED * 2;
    const pad = 80;
    const fitScale = Math.min((cw - pad * 2) / bw, (ch - pad * 2) / bh, 2);
    setSvgScale(fitScale);
    setSvgPan({
      x: (cw - bw * fitScale) / 2,
      y: (ch - bh * fitScale) / 2
    });
  }, [dielineData?.width, dielineData?.height, currentType]); // only run when size changes fundamentally

  // --- 3D Preview Builder ---
  const build3DPreview = (targetGroup, type, mat, edgeMat) => {
    while (targetGroup.children.length) targetGroup.remove(targetGroup.children[0]);

    const hw = W / 2, hl = L / 2, hh = H / 2;
    const flapAngle = 0.45;

    function addPanel(w, h, px, py, pz, rx, ry, rz) {
      const geo = new THREE.PlaneGeometry(w, h);
      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.set(px, py, pz);
      mesh.rotation.set(rx || 0, ry || 0, rz || 0);
      targetGroup.add(mesh);
      const edges = new THREE.EdgesGeometry(geo);
      const line = new THREE.LineSegments(edges, edgeMat);
      line.position.copy(mesh.position);
      line.rotation.copy(mesh.rotation);
      targetGroup.add(line);
      return mesh;
    }

    function addPivotPanel(w, h, px, py, pz, rx, ry, rz, lx, ly, lz) {
      const geo = new THREE.PlaneGeometry(w, h);
      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.set(lx || 0, ly || 0, lz || 0);
      const pivot = new THREE.Group();
      pivot.position.set(px, py, pz);
      pivot.rotation.set(rx || 0, ry || 0, rz || 0);
      pivot.add(mesh);
      targetGroup.add(pivot);
      return pivot;
    }

    function addOpenBox(includeBottom = true) {
      addPanel(W, H, 0, 0, hl, 0, 0, 0);
      addPanel(W, H, 0, 0, -hl, 0, Math.PI, 0);
      addPanel(L, H, -hw, 0, 0, 0, -Math.PI / 2, 0);
      addPanel(L, H, hw, 0, 0, 0, Math.PI / 2, 0);
      if (includeBottom) addPanel(W, L, 0, -hh, 0, -Math.PI / 2, 0, 0);
    }

    function addTuckFlaps() {
      addPivotPanel(W, L / 3, 0, hh, hl, -flapAngle, 0, 0, 0, L / 6, 0);
      addPivotPanel(W, L / 3, 0, hh, -hl, flapAngle, 0, 0, 0, L / 6, 0);
      addPivotPanel(L, W / 3, hw, hh, 0, 0, 0, -flapAngle * 0.7, 0, W / 6, 0).children[0].rotation.y = Math.PI / 2;
      addPivotPanel(L, W / 3, -hw, hh, 0, 0, 0, flapAngle * 0.7, 0, W / 6, 0).children[0].rotation.y = Math.PI / 2;
    }

    function addGableRoof() {
      const roofRise = Math.max(H * 0.45, 18);
      addPanel(W, Math.hypot(hl, roofRise), 0, hh + roofRise / 2, hl / 2, -0.85, 0, 0);
      addPanel(W, Math.hypot(hl, roofRise), 0, hh + roofRise / 2, -hl / 2, 0.85, 0, 0);
    }

    function addClosedTop() {
      addPanel(W, L, 0, hh, 0, -Math.PI / 2, 0, 0);
    }

    function addPillow() {
      const geo = new THREE.SphereGeometry(1, 48, 32);
      const mesh = new THREE.Mesh(geo, mat);
      mesh.scale.set(hw, hh * 0.55, hl);
      targetGroup.add(mesh);
      // Seam crease line around the pillow
      const pts = [];
      for (let i = 0; i <= 64; i++) {
        const a = (i / 64) * Math.PI * 2;
        pts.push(new THREE.Vector3(Math.cos(a) * hw, 0, Math.sin(a) * hl));
      }
      const seam = new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), edgeMat);
      targetGroup.add(seam);
    }

    function addHexagonal() {
      const R = Math.max(hw, hl);
      const geo = new THREE.CylinderGeometry(R, R, H, 6);
      const mesh = new THREE.Mesh(geo, mat);
      targetGroup.add(mesh);
      const edges = new THREE.EdgesGeometry(geo, 10);
      targetGroup.add(new THREE.LineSegments(edges, edgeMat));
    }

    function addTwoPiece() {
      // Base tray
      addOpenBox(true);
      // Lid hovering above the base
      const W2 = W + 8, L2 = L + 8;
      const lidH = Math.max(H * 0.35, 12);
      const yLid = hh + H * 0.35;
      addPanel(W2, lidH, 0, yLid, L2 / 2, 0, 0, 0);
      addPanel(W2, lidH, 0, yLid, -L2 / 2, 0, Math.PI, 0);
      addPanel(L2, lidH, -W2 / 2, yLid, 0, 0, -Math.PI / 2, 0);
      addPanel(L2, lidH, W2 / 2, yLid, 0, 0, Math.PI / 2, 0);
      addPanel(W2, L2, 0, yLid + lidH / 2, 0, -Math.PI / 2, 0, 0);
    }

    function addWindowBox() {
      // Front panel with a window hole
      const shape = new THREE.Shape();
      shape.moveTo(-hw, -hh); shape.lineTo(hw, -hh); shape.lineTo(hw, hh); shape.lineTo(-hw, hh); shape.closePath();
      const wx = (W * 0.62) / 2, wy = (H * 0.62) / 2;
      const hole = new THREE.Path();
      hole.moveTo(-wx, -wy); hole.lineTo(wx, -wy); hole.lineTo(wx, wy); hole.lineTo(-wx, wy); hole.closePath();
      shape.holes.push(hole);
      const frontGeo = new THREE.ShapeGeometry(shape);
      const front = new THREE.Mesh(frontGeo, mat);
      front.position.set(0, 0, hl);
      targetGroup.add(front);
      const fEdges = new THREE.EdgesGeometry(frontGeo);
      const fLine = new THREE.LineSegments(fEdges, edgeMat);
      fLine.position.copy(front.position);
      targetGroup.add(fLine);
      // Transparent window film
      const glass = new THREE.Mesh(
        new THREE.PlaneGeometry(wx * 2, wy * 2),
        new THREE.MeshPhysicalMaterial({ color: 0xbfd8e6, transparent: true, opacity: 0.22, roughness: 0.1, side: THREE.DoubleSide })
      );
      glass.position.set(0, 0, hl);
      targetGroup.add(glass);
      // Remaining closed panels
      addPanel(W, H, 0, 0, -hl, 0, Math.PI, 0);
      addPanel(L, H, -hw, 0, 0, 0, -Math.PI / 2, 0);
      addPanel(L, H, hw, 0, 0, 0, Math.PI / 2, 0);
      addPanel(W, L, 0, -hh, 0, -Math.PI / 2, 0, 0);
      addClosedTop();
    }

    function addHangerBox() {
      addOpenBox(true);
      addClosedTop();
      // Hang tab with euro hole rising above the back panel
      const tabH = Math.max(H * 0.4, 20);
      const shape = new THREE.Shape();
      const r = Math.min(8, hw / 2);
      shape.moveTo(-hw, 0);
      shape.lineTo(-hw, tabH - r);
      shape.quadraticCurveTo(-hw, tabH, -hw + r, tabH);
      shape.lineTo(hw - r, tabH);
      shape.quadraticCurveTo(hw, tabH, hw, tabH - r);
      shape.lineTo(hw, 0);
      shape.closePath();
      const hole = new THREE.Path();
      hole.absarc(0, tabH * 0.55, Math.min(5, tabH / 5), 0, Math.PI * 2, true);
      shape.holes.push(hole);
      const tabGeo = new THREE.ShapeGeometry(shape);
      const tab = new THREE.Mesh(tabGeo, mat);
      tab.position.set(0, hh, -hl);
      targetGroup.add(tab);
      const tEdges = new THREE.EdgesGeometry(tabGeo);
      const tLine = new THREE.LineSegments(tEdges, edgeMat);
      tLine.position.copy(tab.position);
      targetGroup.add(tLine);
    }

    if (type === 'sleeve') {
      addOpenBox(false);
    } else if (type === 'tray') {
      addOpenBox(true);
    } else if (type === 'gable') {
      addOpenBox(true);
      addGableRoof();
    } else if (type === 'pillow') {
      addPillow();
    } else if (type === 'hexagonal') {
      addHexagonal();
    } else if (type === 'rigid-two') {
      addTwoPiece();
    } else if (type === 'window-box') {
      addWindowBox();
    } else if (type === 'hanger') {
      addHangerBox();
    } else if (type === 'snap-lock') {
      addOpenBox(true);
      addClosedTop();
    } else {
      addOpenBox(true);
      addTuckFlaps();
    }
  };

  const setupScene = (canvas, isMini) => {
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(isMini ? 0x0a0908 : 0x0a0908);
    const camera = new THREE.PerspectiveCamera(45, canvas.clientWidth / canvas.clientHeight, 1, 2000);
    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
    renderer.setSize(canvas.clientWidth, canvas.clientHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.1;

    const controls = new OrbitControls(camera, canvas);
    controls.enableDamping = true;
    controls.dampingFactor = 0.08;

    const amb = new THREE.AmbientLight(0xfff5e6, 0.5);
    scene.add(amb);
    const dir = new THREE.DirectionalLight(0xffffff, 1.2);
    dir.position.set(100, 200, 150);
    scene.add(dir);
    const dir2 = new THREE.DirectionalLight(0xd4913b, 0.3);
    dir2.position.set(-100, 50, -100);
    scene.add(dir2);

    const gridH = new THREE.GridHelper(600, 30, 0x2a2319, 0x1a1612);
    gridH.position.y = -150;
    scene.add(gridH);

    const group = new THREE.Group();
    scene.add(group);

    return { scene, camera, renderer, controls, group };
  };

  // Mini 3D Effect
  useEffect(() => {
    if (!miniCanvasRef.current) return;
    const { scene, camera, renderer, controls, group } = setupScene(miniCanvasRef.current, true);
    miniSceneRef.current = { scene, camera, renderer, controls, group };

    const animate = () => {
      requestAnimationFrame(animate);
      controls.update();
      renderer.render(scene, camera);
    };
    animate();

    return () => {
      renderer.dispose();
    };
  }, []);

  // Full 3D Effect
  useEffect(() => {
    if (activeTab !== 'preview' || !fullCanvasRef.current) return;
    const { scene, camera, renderer, controls, group } = setupScene(fullCanvasRef.current, false);
    fullSceneRef.current = { scene, camera, renderer, controls, group };

    const animate = () => {
      requestAnimationFrame(animate);
      controls.update();
      renderer.render(scene, camera);
    };
    animate();

    return () => {
      renderer.dispose();
      fullSceneRef.current = null;
    };
  }, [activeTab]);

  // Update 3D Geometry when L,W,H change
  useEffect(() => {
    const updateGeo = (sceneObj) => {
      if (!sceneObj) return;
      const { group, camera, controls } = sceneObj;
      const mat = new THREE.MeshPhysicalMaterial({
        color: 0xf5f0e8, roughness: 0.75, metalness: 0.0,
        side: THREE.DoubleSide, transparent: true, opacity: 0.92,
      });
      const edgeMat = new THREE.LineBasicMaterial({ color: 0x3a3228 });
      build3DPreview(group, currentType, mat, edgeMat);
      const maxDim = Math.max(L, W, H);
      camera.position.set(maxDim * 1.2, maxDim * 0.9, maxDim * 1.5);
      controls.target.set(0, 0, 0);
      controls.update();
    };

    updateGeo(miniSceneRef.current);
    updateGeo(fullSceneRef.current);
  }, [L, W, H, currentType, activeTab]);


  // --- Event Handlers ---
  const handleSvgWheel = (e) => {
    e.preventDefault();
    const factor = e.deltaY < 0 ? 1.1 : 1 / 1.1;
    const cx = e.nativeEvent.offsetX;
    const cy = e.nativeEvent.offsetY;
    
    setSvgPan(prev => ({
      x: cx - (cx - prev.x) * factor,
      y: cy - (cy - prev.y) * factor
    }));
    setSvgScale(prev => Math.max(0.1, Math.min(5, prev * factor)));
  };

  const handleSvgMouseDown = (e) => {
    isPanning.current = true;
    panStart.current = { x: e.clientX - svgPan.x, y: e.clientY - svgPan.y };
  };

  const handleSvgMouseMove = (e) => {
    if (!isPanning.current) return;
    setSvgPan({
      x: e.clientX - panStart.current.x,
      y: e.clientY - panStart.current.y
    });
  };

  const handleSvgMouseUp = () => {
    isPanning.current = false;
  };

  const applyPreset = (l, w, h) => {
    setL(l); setW(w); setH(h);
  };

  const handleTypeSelect = (id, impl) => {
    if (!impl) {
      alert("This template is in the pipeline — architecture ready for implementation");
      return;
    }
    setCurrentType(id);
  };

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
          <h1 className="text-base font-bold tracking-tight">{dieline?.name || 'Dieline Studio'}</h1>
          <span className="text-[11px] text-muted bg-card px-2 py-0.5 rounded">v2.0</span>
        </div>
        <div className="flex-1"></div>
        <div className="flex items-center gap-3">
          <span className="text-xs text-muted">{Object.keys(GENERATORS).length} / 1928 templates</span>
          <div className="w-[1px] h-5 bg-border"></div>
          <button className="btn" onClick={() => setShowArchModal(true)} title="Architecture Info">
            <i className="fas fa-layer-group"></i> Architecture
          </button>
        </div>
      </header>

      <div className="flex h-[calc(100vh-56px)]">
        {/* Sidebar */}
        <nav className="ds-sidebar">
          {BOX_TYPES.map((cat, idx) => (
            <div key={idx}>
              <div className="ds-sidebar-cat">{cat.cat}</div>
              {cat.items.map(item => (
                <div 
                  key={item.id} 
                  className={`ds-sidebar-item ${item.id === currentType ? 'active' : ''} ${!item.impl ? 'locked' : ''}`}
                  onClick={() => handleTypeSelect(item.id, item.impl)}
                >
                  <i className={`fas ${item.icon} w-3.5 text-center text-[11px]`}></i>
                  {item.name}
                  {item.impl ? (
                    <span className="ds-badge">Ready</span>
                  ) : (
                    <span className="ds-badge"><i className="fas fa-lock text-[8px]"></i></span>
                  )}
                </div>
              ))}
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

          {/* 2D Viewport */}
          <div 
            className="ds-svg-container" 
            style={{ display: activeTab === 'dieline' ? 'block' : 'none' }}
            ref={svgContainerRef}
            onWheel={handleSvgWheel}
            onMouseDown={handleSvgMouseDown}
            onMouseMove={handleSvgMouseMove}
            onMouseUp={handleSvgMouseUp}
            onMouseLeave={handleSvgMouseUp}
          >
            <div className="ds-svg-overlay">
              <button className="btn" onClick={() => setSvgScale(s => s * 1.3)}><i className="fas fa-plus"></i></button>
              <button className="btn" onClick={() => setSvgScale(s => Math.max(0.1, s / 1.3))}><i className="fas fa-minus"></i></button>
              <button className="btn" onClick={() => setShowDimensions(d => !d)}><i className="fas fa-ruler"></i></button>
              <button className="btn" onClick={() => setShowBleed(b => !b)}>
                <i className="fas fa-square-full" style={{ color: showBleed ? 'var(--accent)' : 'var(--border)' }}></i>
              </button>
            </div>
            
            <div className="ds-info-bar">
              <span><span className="ds-legend-dot bg-cut"></span> Cut</span>
              <span><span className="ds-legend-dot bg-crease"></span> Crease</span>
              {showBleed && <span><span className="ds-legend-dot bg-bleed"></span> Bleed (3mm)</span>}
              <span>Sheet: {dielineData?.width.toFixed(1)} × {dielineData?.height.toFixed(1)} mm</span>
            </div>

            {dielineData && (
              <svg width="100%" height="100%">
                <g transform={`translate(${svgPan.x},${svgPan.y}) scale(${svgScale})`}>
                  {showBleed && (
                    <>
                      <defs>
                        <filter id="bleedDilate" x="-30%" y="-30%" width="160%" height="160%">
                          <feMorphology operator="dilate" radius={BLEED * svgScale} in="SourceGraphic" result="dil"/>
                          <feComposite in="dil" in2="SourceGraphic" operator="out" result="ring"/>
                          <feFlood floodColor="var(--bleed)" result="col"/>
                          <feComposite in="col" in2="ring" operator="in" result="bleed"/>
                        </filter>
                      </defs>
                      <g filter="url(#bleedDilate)">
                        {dielineData.cut.map((d, i) => (
                          <path key={`b-${i}`} d={d} fill="#000" stroke="none" />
                        ))}
                      </g>
                    </>
                  )}
                  {dielineData.crease.map((d, i) => (
                    <path key={`cr-${i}`} d={d} fill="none" stroke="var(--crease)" strokeWidth={0.8/svgScale} strokeDasharray={`${4/svgScale},${3/svgScale}`} shapeRendering="geometricPrecision" />
                  ))}
                  {dielineData.cut.map((d, i) => (
                    <path key={`ct-${i}`} d={d} fill="none" stroke="var(--cut)" strokeWidth={1.2/svgScale} shapeRendering="geometricPrecision" />
                  ))}
                  {showDimensions && dielineData.annotations && dielineData.annotations.map((a, i) => (
                    a.dim ? (
                      <text key={`a-${i}`} x={a.x} y={a.y} className="ds-dim-text" textAnchor="middle" transform={a.rotate ? `rotate(-90,${a.x},${a.y})` : ''}>
                        {a.text} mm
                      </text>
                    ) : (
                      <text key={`a-${i}`} x={a.x} y={a.y} className="ds-panel-label">{a.text}</text>
                    )
                  ))}
                </g>
              </svg>
            )}
          </div>

          {/* 3D Viewport Full */}
          <div className="ds-svg-container !bg-[#0a0908]" style={{ display: activeTab === 'preview' ? 'block' : 'none' }}>
            <canvas ref={fullCanvasRef} className="w-full h-full block" />
            <div className="ds-info-bar">
              <span><i className="fas fa-mouse-pointer text-[10px]"></i> Drag to rotate</span>
              <span><i className="fas fa-search-plus text-[10px]"></i> Scroll to zoom</span>
            </div>
          </div>

          {/* Bottom Panel */}
          <div className="ds-bottom-panel">
            <div className="ds-panel-3d">
              <canvas ref={miniCanvasRef} className="w-full h-full block" />
              <div className="absolute top-2 left-2 text-[10px] text-muted bg-[rgba(12,10,8,0.7)] px-2 py-1 rounded">
                <i className="fas fa-cube"></i> 3D Preview
              </div>
            </div>
            
            <div className="ds-panel-controls">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-[15px] font-bold">{typeInfo.name}</h3>
                <div className="flex gap-1.5">
                  <button className="btn btn-primary" onClick={() => alert('SVG Export Coming Soon!')}><i className="fas fa-download"></i> SVG</button>
                  <button className="btn" onClick={() => alert('DXF Export Coming Soon!')}><i className="fas fa-file-export"></i> DXF</button>
                </div>
              </div>

              <div className="ds-ctrl-group">
                <div className="ds-ctrl-label">Dimensions</div>
                <div className="ds-ctrl-row mb-2">
                  <span className="text-xs text-fg2 w-4">L</span>
                  <input type="range" className="ds-ctrl-slider" min="50" max="500" value={L} onChange={e=>setL(+e.target.value)} />
                  <input type="number" className="ds-ctrl-input" value={L} onChange={e=>setL(+e.target.value)} />
                  <span className="ds-ctrl-unit">mm</span>
                </div>
                <div className="ds-ctrl-row mb-2">
                  <span className="text-xs text-fg2 w-4">W</span>
                  <input type="range" className="ds-ctrl-slider" min="30" max="400" value={W} onChange={e=>setW(+e.target.value)} />
                  <input type="number" className="ds-ctrl-input" value={W} onChange={e=>setW(+e.target.value)} />
                  <span className="ds-ctrl-unit">mm</span>
                </div>
                <div className="ds-ctrl-row mb-2">
                  <span className="text-xs text-fg2 w-4">H</span>
                  <input type="range" className="ds-ctrl-slider" min="30" max="400" value={H} onChange={e=>setH(+e.target.value)} />
                  <input type="number" className="ds-ctrl-input" value={H} onChange={e=>setH(+e.target.value)} />
                  <span className="ds-ctrl-unit">mm</span>
                </div>
                <div className="ds-ctrl-row">
                  <span className="text-xs text-fg2 w-4">T</span>
                  <input type="range" className="ds-ctrl-slider" min="0.3" max="5" step="0.1" value={T} onChange={e=>setT(+e.target.value)} />
                  <input type="number" className="ds-ctrl-input" value={T} onChange={e=>setT(+e.target.value)} />
                  <span className="ds-ctrl-unit">mm</span>
                </div>
              </div>

              <div className="ds-ctrl-group">
                <div className="ds-ctrl-label">Presets</div>
                <div className="ds-preset-grid">
                  <button className="ds-preset-btn" onClick={() => applyPreset(100,70,40)}>Small</button>
                  <button className="ds-preset-btn" onClick={() => applyPreset(200,150,100)}>Medium</button>
                  <button className="ds-preset-btn" onClick={() => applyPreset(300,200,120)}>Large</button>
                  <button className="ds-preset-btn" onClick={() => applyPreset(250,175,80)}>Mailer</button>
                  <button className="ds-preset-btn" onClick={() => applyPreset(180,120,60)}>Gift</button>
                  <button className="ds-preset-btn" onClick={() => applyPreset(400,300,150)}>Bulk</button>
                </div>
              </div>

              {dielineData && (
                <div className="ds-ctrl-group !mb-0">
                  <div className="ds-ctrl-label">Sheet Info</div>
                  <div className="grid grid-cols-2 gap-1.5 text-xs">
                    <div className="bg-card px-2.5 py-2 rounded border border-border">
                      <div className="text-muted text-[10px]">Sheet Size</div>
                      <div className="font-mono font-semibold">{dielineData.width.toFixed(0)} × {dielineData.height.toFixed(0)} mm</div>
                    </div>
                    <div className="bg-card px-2.5 py-2 rounded border border-border">
                      <div className="text-muted text-[10px]">Area</div>
                      <div className="font-mono font-semibold">{(dielineData.width*dielineData.height/10000).toFixed(1)} cm²</div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Arch Modal */}
      {showArchModal && (
        <div className="fixed inset-0 z-50 bg-[rgba(0,0,0,0.7)] backdrop-blur-sm flex items-center justify-center">
          <div className="bg-card border border-border rounded-xl max-w-2xl w-[90%] p-8 relative shadow-2xl">
            <button onClick={() => setShowArchModal(false)} className="absolute top-4 right-4 text-muted hover:text-fg text-xl">
              <i className="fas fa-times"></i>
            </button>
            <h2 className="text-xl font-bold mb-4 text-accent">Scalable Architecture for 1918 Dielines</h2>
            <div className="text-sm text-fg2 leading-relaxed">
              <p>This implementation proves the architecture using 6 fundamental box types built with 100% parametric mathematics (no external dependencies).</p>
              <h3 className="text-fg mt-4 mb-2 font-bold text-sm">Next Steps</h3>
              <ul className="list-disc pl-5">
                <li>Expand to other 1900+ box types using the same graph-based topological solver.</li>
                <li>Implement automated DXF generation (which can be derived trivially from the exact SVG cut/crease paths).</li>
              </ul>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
