import React, { useState, useEffect, useRef } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import './DielineDetailPage.css';

export default function DielineDetailPage({ dieline, onBack }) {
  // ========== State ==========
  const [dim, setDim] = useState({ L: 315, W: 202, H: 62 });
  const [selectedMaterial, setSelectedMaterial] = useState('E');
  const [sizeMode, setSizeMode] = useState('manufacture');
  const [zoom, setZoom] = useState(1);
  const [toastMsg, setToastMsg] = useState('');
  const [showToast, setShowToast] = useState(false);

  // ========== Refs ==========
  const canvasRef = useRef(null);
  const threeContainerRef = useRef(null);
  const dielineSectionRef = useRef(null);

  // Dynamic values
  const panRef = useRef({ x: 0, y: 0 });
  const draggingRef = useRef(false);
  const dragStartRef = useRef({ x: 0, y: 0 });

  const matThickness = {
    F: '0.8mm',
    E: '1.5mm',
    B: '3.0mm',
    C: '3.8mm',
    EB: '4.5mm',
    BC: '6.8mm',
  };

  // Three.js variables
  const threeRef = useRef({
    scene: null,
    camera: null,
    renderer: null,
    controls: null,
    boxGrp: null,
    lidGrp: null,
    initialized: false,
  });

  // Load Tailwind CDN dynamically for this component's classes
  useEffect(() => {
    const script = document.createElement('script');
    script.src = 'https://cdn.tailwindcss.com';
    script.async = true;
    document.head.appendChild(script);

    // Font Awesome for icons
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = 'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.0/css/all.min.css';
    document.head.appendChild(link);

    return () => {
      document.head.removeChild(script);
      document.head.removeChild(link);
    };
  }, []);

  // ========== Toast Handler ==========
  const triggerToast = (msg) => {
    setToastMsg(msg);
    setShowToast(true);
    setTimeout(() => setShowToast(false), 2200);
  };

  // ========== 2D Dieline Drawing Geometry ==========
  const getGeom = () => {
    const { L, W, H } = dim;
    const glW = Math.round(W * 0.2);
    const duH = Math.round(W * 0.4);
    const liH = H;
    const tuH = Math.round(W * 0.14);
    const boH = duH;
    const dI = Math.round(W * 0.08);
    const gI = Math.round(glW * 0.3);

    const xG = 0, xS1 = glW, xF = glW + W, xB = glW + W + L, xS2 = glW + W + L + L;
    const tW = glW + W + L + L + W;
    const topH = Math.max(duH, liH + tuH);
    const yTu = 0, yLi = tuH, yDuT = topH - duH;
    const mY = topH, yBo = mY + H;
    const tH = yBo + boH;

    return { glW, duH, liH, tuH, boH, dI, gI, xG, xS1, xF, xB, xS2, tW, yTu, yLi, yDuT, mY, yBo, tH, topH };
  };

  const drawDieline = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const rect = dielineSectionRef.current.getBoundingClientRect();

    // Clear and draw grid
    ctx.clearRect(0, 0, rect.width, rect.height);
    
    // Draw Grid
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, rect.width, rect.height);
    ctx.strokeStyle = '#f3f4f6';
    ctx.lineWidth = 0.5;
    for (let x = 0; x < rect.width; x += 20) {
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, rect.height); ctx.stroke();
    }
    for (let y = 0; y < rect.height; y += 20) {
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(rect.width, y); ctx.stroke();
    }

    const g = getGeom();
    ctx.save();
    ctx.translate(rect.width / 2 + panRef.current.x, rect.height / 2 + panRef.current.y);
    const sc = Math.min(rect.width * 0.88 / g.tW, rect.height * 0.88 / g.tH) * zoom;
    ctx.scale(sc, sc);
    ctx.translate(-g.tW / 2, -g.tH / 2);

    const lw = 1.2 / sc, dlw = 0.7 / sc;

    // Fill panels
    const fillRect = (x, y, w, h, c) => { ctx.fillStyle = c; ctx.fillRect(x, y, w, h); };
    const fillTrap = (x1, y1, x2, y2, x3, y3, x4, y4, c) => {
      ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.lineTo(x3, y3); ctx.lineTo(x4, y4); ctx.closePath();
      ctx.fillStyle = c; ctx.fill();
    };

    fillRect(g.xS1, g.mY, dim.W, dim.H, '#ffffff');
    fillRect(g.xF, g.mY, dim.L, dim.H, '#fefefe');
    fillRect(g.xB, g.mY, dim.L, dim.H, '#fefefe');
    fillRect(g.xS2, g.mY, dim.W, dim.H, '#ffffff');
    fillRect(g.xB, g.yLi, dim.L, g.liH, '#f8f8f4');

    // Tuck flap
    ctx.beginPath();
    ctx.moveTo(g.xB, g.yLi);
    ctx.lineTo(g.xB + dim.L, g.yLi);
    ctx.lineTo(g.xB + dim.L, g.yLi * 0.38);
    ctx.quadraticCurveTo(g.xB + dim.L / 2, g.yTu - g.tuH * 0.15, g.xB, g.yLi * 0.38);
    ctx.closePath();
    ctx.fillStyle = '#f5f5f0'; ctx.fill();

    // Flaps
    fillTrap(g.xS1 + g.dI, g.yDuT, g.xS1 + dim.W - g.dI, g.yDuT, g.xS1 + dim.W, g.mY, g.xS1, g.mY, '#f5f5f2');
    fillTrap(g.xS2 + g.dI, g.yDuT, g.xS2 + dim.W - g.dI, g.yDuT, g.xS2 + dim.W, g.mY, g.xS2, g.mY, '#f5f5f2');
    fillTrap(g.xS1, g.yBo, g.xS1 + dim.W, g.yBo, g.xS1 + dim.W - g.dI, g.yBo + g.boH, g.xS1 + g.dI, g.yBo + g.boH, '#f5f5f2');
    fillTrap(g.xS2, g.yBo, g.xS2 + dim.W, g.yBo, g.xS2 + dim.W - g.dI, g.yBo + g.boH, g.xS2 + g.dI, g.yBo + g.boH, '#f5f5f2');
    fillRect(g.xF, g.yBo, dim.L, g.boH, '#f8f8f4');
    fillTrap(g.xG, g.mY, g.xG + g.glW, g.mY + g.gI, g.xG + g.glW, g.mY + dim.H - g.gI, g.xG, g.mY + dim.H, '#f0f0ec');

    // Stroke Cut lines (Solid)
    ctx.strokeStyle = '#222'; ctx.lineWidth = lw; ctx.setLineDash([]);
    const strokeRect = (x, y, w, h) => { ctx.strokeRect(x, y, w, h); };
    strokeRect(g.xS1, g.mY, dim.W, dim.H);
    strokeRect(g.xF, g.mY, dim.L, dim.H);
    strokeRect(g.xB, g.mY, dim.L, dim.H);
    strokeRect(g.xS2, g.mY, dim.W, dim.H);
    strokeRect(g.xB, g.yLi, dim.L, g.liH);

    ctx.beginPath();
    ctx.moveTo(g.xB, g.yLi);
    ctx.lineTo(g.xB + dim.L, g.yLi);
    ctx.lineTo(g.xB + dim.L, g.yLi * 0.38);
    ctx.quadraticCurveTo(g.xB + dim.L / 2, g.yTu - g.tuH * 0.15, g.xB, g.yLi * 0.38);
    ctx.closePath();
    ctx.stroke();

    const strokeTrap = (x1, y1, x2, y2, x3, y3, x4, y4) => {
      ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.lineTo(x3, y3); ctx.lineTo(x4, y4); ctx.closePath(); ctx.stroke();
    };
    strokeTrap(g.xS1 + g.dI, g.yDuT, g.xS1 + dim.W - g.dI, g.yDuT, g.xS1 + dim.W, g.mY, g.xS1, g.mY);
    strokeTrap(g.xS2 + g.dI, g.yDuT, g.xS2 + dim.W - g.dI, g.yDuT, g.xS2 + dim.W, g.mY, g.xS2, g.mY);
    strokeTrap(g.xS1, g.yBo, g.xS1 + dim.W, g.yBo, g.xS1 + dim.W - g.dI, g.yBo + g.boH, g.xS1 + g.dI, g.yBo + g.boH);
    strokeTrap(g.xS2, g.yBo, g.xS2 + dim.W, g.yBo, g.xS2 + dim.W - g.dI, g.yBo + g.boH, g.xS2 + g.dI, g.yBo + g.boH);
    strokeRect(g.xF, g.yBo, dim.L, g.boH);
    strokeTrap(g.xG, g.mY, g.xG + g.glW, g.mY + g.gI, g.xG + g.glW, g.mY + dim.H - g.gI, g.xG, g.mY + dim.H);

    // Stroke Fold lines (Dashed)
    ctx.strokeStyle = '#888'; ctx.lineWidth = dlw;
    ctx.setLineDash([5 / sc, 3 / sc]);
    const foldLine = (x1, y1, x2, y2) => { ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke(); };
    foldLine(g.xS1, g.mY, g.xS1, g.mY + dim.H);
    foldLine(g.xF, g.mY, g.xF, g.mY + dim.H);
    foldLine(g.xB, g.mY, g.xB, g.mY + dim.H);
    foldLine(g.xS2, g.mY, g.xS2, g.mY + dim.H);
    foldLine(g.xS1, g.mY, g.xS2 + dim.W, g.mY);
    foldLine(g.xS1, g.mY + dim.H, g.xS2 + dim.W, g.mY + dim.H);
    foldLine(g.xB, g.yLi, g.xB + dim.L, g.yLi);
    ctx.setLineDash([]);

    // Draw dimension values
    const as = 4 / sc, fs = Math.max(9, 10.5 / sc), off = 16 / sc;
    ctx.font = `600 ${fs}px 'DM Sans', sans-serif`;
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.strokeStyle = '#059669'; ctx.lineWidth = 0.8 / sc;

    const arrowLine = (x1, y1, x2, y2, label, lx, ly) => {
      ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
      const a = Math.atan2(y2 - y1, x2 - x1);
      [[x1, y1, a + Math.PI], [x2, y2, a]].forEach(([px, py, ang]) => {
        ctx.beginPath(); ctx.moveTo(px, py);
        ctx.lineTo(px + Math.cos(ang + .4) * as, py + Math.sin(ang + .4) * as);
        ctx.moveTo(px, py);
        ctx.lineTo(px + Math.cos(ang - .4) * as, py + Math.sin(ang - .4) * as);
        ctx.stroke();
      });
      const tw = ctx.measureText(label).width + 6 / sc;
      ctx.fillStyle = '#fff'; ctx.fillRect(lx - tw / 2, ly - fs / 2 - 1 / sc, tw, fs + 2 / sc);
      ctx.fillStyle = '#059669'; ctx.fillText(label, lx, ly);
    };

    // L Arrow
    arrowLine(g.xF, g.mY + dim.H + off, g.xF + dim.L, g.mY + dim.H + off, `${dim.L} mm`, g.xF + dim.L / 2, g.mY + dim.H + off + 11 / sc);
    // H Arrow
    arrowLine(g.xF - off, g.mY, g.xF - off, g.mY + dim.H, `${dim.H} mm`, g.xF - off - 14 / sc, g.mY + dim.H / 2);
    // W Arrow
    arrowLine(g.xS2 + dim.W + off, g.mY, g.xS2 + dim.W + off, g.mY + dim.H, `${dim.W} mm`, g.xS2 + dim.W + off + 14 / sc, g.mY + dim.H / 2);

    // Labels
    ctx.font = `500 ${Math.max(9, 10 / sc)}px 'DM Sans', sans-serif`;
    ctx.fillStyle = '#bbb';
    ctx.fillText('SIDE', g.xS1 + dim.W / 2, g.mY + dim.H / 2);
    ctx.fillText('FRONT', g.xF + dim.L / 2, g.mY + dim.H / 2);
    ctx.fillText('BACK', g.xB + dim.L / 2, g.mY + dim.H / 2);
    ctx.fillText('SIDE', g.xS2 + dim.W / 2, g.mY + dim.H / 2);
    ctx.fillText('LID', g.xB + dim.L / 2, g.yLi + g.liH / 2);

    ctx.restore();
  };

  // ========== Canvas Resizing and Drawing Trigger ==========
  const resize2DCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas || !dielineSectionRef.current) return;
    const rect = dielineSectionRef.current.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    canvas.style.width = rect.width + 'px';
    canvas.style.height = rect.height + 'px';
    const ctx = canvas.getContext('2d');
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    drawDieline();
  };

  useEffect(() => {
    resize2DCanvas();
    window.addEventListener('resize', resize2DCanvas);
    return () => window.removeEventListener('resize', resize2DCanvas);
  }, [dim, zoom]);

  // ========== Mouse Dragging Events for 2D Canvas ==========
  const handleMouseDown = (e) => {
    draggingRef.current = true;
    dragStartRef.current = { x: e.clientX - panRef.current.x, y: e.clientY - panRef.current.y };
  };

  const handleMouseMove = (e) => {
    if (!draggingRef.current) return;
    panRef.current = { x: e.clientX - dragStartRef.current.x, y: e.clientY - dragStartRef.current.y };
    drawDieline();
  };

  const handleMouseUpOrLeave = () => {
    draggingRef.current = false;
  };

  const handleWheel = (e) => {
    e.preventDefault();
    setZoom((prev) => Math.max(0.15, Math.min(5, prev * (e.deltaY > 0 ? 0.9 : 1.1))));
  };

  // ========== Three.js initialization and updates ==========
  const updateThreeGeom = () => {
    const three = threeRef.current;
    if (!three.initialized || !three.scene) return;

    if (three.boxGrp) three.scene.remove(three.boxGrp);
    three.boxGrp = new THREE.Group();

    const scale = 0.006;
    const l = dim.L * scale;
    const w = dim.W * scale;
    const h = dim.H * scale;

    const mat = new THREE.MeshStandardMaterial({ color: 0xf7f3ec, side: THREE.DoubleSide, roughness: 0.85, metalness: 0 });
    const matS = new THREE.MeshStandardMaterial({ color: 0xf0ece4, side: THREE.DoubleSide, roughness: 0.9, metalness: 0 });
    const edgeM = new THREE.LineBasicMaterial({ color: 0x999999 });

    const addPanel = (geo, pos, rot, m) => {
      const mesh = new THREE.Mesh(geo, m || mat);
      mesh.position.copy(pos);
      if (rot) { mesh.rotation.x = rot.x || 0; mesh.rotation.y = rot.y || 0; mesh.rotation.z = rot.z || 0; }
      mesh.castShadow = true; mesh.receiveShadow = true;
      three.boxGrp.add(mesh);

      const edge = new THREE.LineSegments(new THREE.EdgesGeometry(geo), edgeM);
      edge.position.copy(pos);
      if (rot) { edge.rotation.x = rot.x || 0; edge.rotation.y = rot.y || 0; edge.rotation.z = rot.z || 0; }
      three.boxGrp.add(edge);
    };

    addPanel(new THREE.PlaneGeometry(l, h), new THREE.Vector3(0, h / 2, w / 2), null);
    addPanel(new THREE.PlaneGeometry(l, h), new THREE.Vector3(0, h / 2, -w / 2), { y: Math.PI });
    addPanel(new THREE.PlaneGeometry(w, h), new THREE.Vector3(-l / 2, h / 2, 0), { y: -Math.PI / 2 }, matS);
    addPanel(new THREE.PlaneGeometry(w, h), new THREE.Vector3(l / 2, h / 2, 0), { y: Math.PI / 2 }, matS);
    addPanel(new THREE.PlaneGeometry(l, w), new THREE.Vector3(0, 0, 0), { x: -Math.PI / 2 }, matS);

    // Lid group
    three.lidGrp = new THREE.Group();
    three.lidGrp.position.set(0, h, -w / 2);
    const lidMat = new THREE.MeshStandardMaterial({ color: 0xf2eee6, side: THREE.DoubleSide, roughness: 0.85, metalness: 0 });
    const lidMesh = new THREE.Mesh(new THREE.PlaneGeometry(l, w), lidMat);
    lidMesh.position.set(0, 0, w / 2);
    lidMesh.rotation.x = -Math.PI / 2;
    lidMesh.castShadow = true;
    three.lidGrp.add(lidMesh);

    const lidEdge = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.PlaneGeometry(l, w)), edgeM);
    lidEdge.position.copy(lidMesh.position); lidEdge.rotation.copy(lidMesh.rotation);
    three.lidGrp.add(lidEdge);

    const tuck = new THREE.Mesh(new THREE.PlaneGeometry(l, w * 0.08), lidMat);
    tuck.position.set(0, -w * 0.04, w);
    tuck.castShadow = true;
    three.lidGrp.add(tuck);
    three.lidGrp.rotation.x = -0.5;
    three.boxGrp.add(three.lidGrp);

    // Fold line
    const foldPts = [new THREE.Vector3(-l / 2, h, -w / 2), new THREE.Vector3(l / 2, h, -w / 2)];
    const foldGeo = new THREE.BufferGeometry().setFromPoints(foldPts);
    const foldLine = new THREE.Line(foldGeo, new THREE.LineDashedMaterial({ color: 0x059669, dashSize: 0.04, gapSize: 0.025 }));
    foldLine.computeLineDistances();
    three.boxGrp.add(foldLine);

    three.scene.add(three.boxGrp);

    const md = Math.max(l, w, h);
    three.camera.position.set(md * 1.1, md * 0.8, md * 1.1);
    three.controls.target.set(0, h * 0.4, 0);
    three.controls.update();
  };

  useEffect(() => {
    const container = threeContainerRef.current;
    if (!container) return;

    const three = threeRef.current;
    const rect = container.getBoundingClientRect();

    // Setup scene, camera, renderer
    three.scene = new THREE.Scene();
    three.scene.background = new THREE.Color(0xf5f5f5);

    three.camera = new THREE.PerspectiveCamera(35, rect.width / rect.height, 0.1, 100);
    three.renderer = new THREE.WebGLRenderer({ antialias: true });
    three.renderer.setPixelRatio(window.devicePixelRatio);
    three.renderer.setSize(rect.width, rect.height);
    three.renderer.shadowMap.enabled = true;
    three.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    container.innerHTML = '';
    container.appendChild(three.renderer.domElement);

    // Lights
    three.scene.add(new THREE.AmbientLight(0xffffff, 0.65));
    const dl = new THREE.DirectionalLight(0xffffff, 0.85);
    dl.position.set(4, 6, 4); dl.castShadow = true;
    dl.shadow.mapSize.set(512, 512);
    three.scene.add(dl);
    three.scene.add(new THREE.DirectionalLight(0xe8eeff, 0.3).translateX(-3).translateY(2));

    // Floor and grid
    const fl = new THREE.Mesh(new THREE.PlaneGeometry(15, 15), new THREE.ShadowMaterial({ opacity: 0.06 }));
    fl.rotation.x = -Math.PI / 2; fl.position.y = -0.01; fl.receiveShadow = true;
    three.scene.add(fl);
    three.scene.add(new THREE.GridHelper(8, 16, 0xe0e0e0, 0xf0f0f0));

    // Controls
    three.controls = new OrbitControls(three.camera, three.renderer.domElement);
    three.controls.enableDamping = true;
    three.controls.dampingFactor = 0.08;
    three.controls.minDistance = 1.5;
    three.controls.maxDistance = 10;
    three.controls.maxPolarAngle = Math.PI * 0.85;

    three.initialized = true;
    updateThreeGeom();

    // Animation Loop
    let animationId;
    const animate = () => {
      animationId = requestAnimationFrame(animate);
      three.controls.update();
      three.renderer.render(three.scene, three.camera);
    };
    animate();

    // Resize Handler
    const handleResize = () => {
      const r = container.getBoundingClientRect();
      if (r.width < 1 || r.height < 1) return;
      three.camera.aspect = r.width / r.height;
      three.camera.updateProjectionMatrix();
      three.renderer.setSize(r.width, r.height);
    };
    window.addEventListener('resize', handleResize);
    const ro = new ResizeObserver(handleResize);
    ro.observe(container);

    return () => {
      cancelAnimationFrame(animationId);
      window.removeEventListener('resize', handleResize);
      ro.disconnect();
    };
  }, []);

  // Update geometry when dim changes
  useEffect(() => {
    updateThreeGeom();
  }, [dim]);

  // ========== SVG Exporter ==========
  const downloadSVG = () => {
    const g = getGeom();
    let s = `<svg xmlns="http://www.w3.org/2000/svg" width="${g.totalW}" height="${g.totalH}" viewBox="0 0 ${g.totalW} ${g.totalH}">`;
    s += `<rect x="0" y="0" width="${g.totalW}" height="${g.totalH}" fill="#fff"/>`;
    [[g.xS1, g.mY, dim.W, dim.H], [g.xF, g.mY, dim.L, dim.H], [g.xB, g.mY, dim.L, dim.H], [g.xS2, g.mY, dim.W, dim.H]].forEach(([x, y, w, h]) => {
      s += `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="none" stroke="#222" stroke-width="1"/>`;
    });
    [[g.xS1, g.mY, g.xS1, g.mY + dim.H], [g.xF, g.mY, g.xF, g.mY + dim.H], [g.xB, g.mY, g.xB, g.mY + dim.H], [g.xS2, g.mY, g.xS2, g.mY + dim.H],
     [g.xS1, g.mY, g.xS2 + dim.W, g.mY], [g.xS1, g.mY + dim.H, g.xS2 + dim.W, g.mY + dim.H]].forEach(([x1, y1, x2, y2]) => {
      s += `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="#888" stroke-width="0.5" stroke-dasharray="4 3"/>`;
    });
    s += `</svg>`;
    const blob = new Blob([s], { type: 'image/svg+xml' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `flip-top-${dim.L}x${dim.W}x${dim.H}.svg`;
    a.click();
    URL.revokeObjectURL(a.href);
    triggerToast('SVG dieline downloaded');
  };

  return (
    <div className="flex flex-col h-screen w-full bg-white overflow-hidden select-none">
      {/* Header */}
      <header className="h-[52px] bg-[#0a0a0a] flex items-center px-5 flex-shrink-0 z-50">
        <button onClick={onBack} className="text-white font-bold text-[15px] tracking-tight mr-8 bg-transparent border-none outline-none cursor-pointer">
          ← PACDORA / {dieline.category.toUpperCase()}
        </button>
        <nav className="hidden md:flex items-center gap-0.5">
          <a href="#" className="px-3 py-1.5 text-[13px] text-gray-400 hover:text-white rounded-md hover:bg-white/5 transition">Dielines</a>
          <a href="#" className="px-3 py-1.5 text-[13px] text-gray-400 hover:text-white rounded-md hover:bg-white/5 transition">3D Viewer</a>
          <a href="#" className="px-3 py-1.5 text-[13px] text-gray-400 hover:text-white rounded-md hover:bg-white/5 transition">Resources</a>
          <a href="#" className="px-3 py-1.5 text-[13px] text-gray-400 hover:text-white rounded-md hover:bg-white/5 transition">Pricing</a>
        </nav>
        <div className="ml-auto flex items-center gap-2">
          <a href="#" className="text-[13px] text-gray-400 hover:text-white transition mr-2">Sign In</a>
          <a href="#" class="text-[13px] bg-white text-gray-900 px-4 py-1.5 rounded-md font-semibold hover:bg-gray-100 transition">Get Started</a>
        </div>
      </header>

      {/* 3-Column Layout */}
      <main className="flex flex-1 overflow-hidden" style={{ height: 'calc(100vh - 52px)' }}>
        
        {/* ===== LEFT PANEL: Settings ===== */}
        <aside className="w-[272px] flex-shrink-0 border-r border-gray-100 overflow-y-auto sidebar-scroll bg-white fade-in">
          <div className="p-5">
            <div className="mb-5">
              <p className="text-[11px] text-gray-400 font-semibold uppercase tracking-wider mb-1">Flip Top Box / Mailer</p>
              <h1 className="text-[15px] font-bold text-gray-900 leading-snug">{dieline.name}</h1>
            </div>

            {/* Custom Size Inputs */}
            <div className="mb-5">
              <p className="text-[11px] text-gray-400 font-semibold uppercase tracking-wider mb-3">Custom size</p>
              <div className="space-y-2.5">
                <div>
                  <label className="text-[12px] text-gray-500 font-medium mb-1 block">Length</label>
                  <div className="dim-field">
                    <input
                      type="number"
                      value={dim.L}
                      min="30"
                      max="800"
                      onChange={(e) => setDim((prev) => ({ ...prev, L: Math.max(30, parseInt(e.target.value) || 0) }))}
                      aria-label="Length"
                    />
                    <span className="unit">mm</span>
                  </div>
                </div>
                <div>
                  <label className="text-[12px] text-gray-500 font-medium mb-1 block">Width</label>
                  <div className="dim-field">
                    <input
                      type="number"
                      value={dim.W}
                      min="20"
                      max="500"
                      onChange={(e) => setDim((prev) => ({ ...prev, W: Math.max(20, parseInt(e.target.value) || 0) }))}
                      aria-label="Width"
                    />
                    <span className="unit">mm</span>
                  </div>
                </div>
                <div>
                  <label className="text-[12px] text-gray-500 font-medium mb-1 block">Height</label>
                  <div className="dim-field">
                    <input
                      type="number"
                      value={dim.H}
                      min="10"
                      max="400"
                      onChange={(e) => setDim((prev) => ({ ...prev, H: Math.max(10, parseInt(e.target.value) || 0) }))}
                      aria-label="Height"
                    />
                    <span className="unit">mm</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Choose Material flutes */}
            <div className="mb-5">
              <p className="text-[11px] text-gray-400 font-semibold uppercase tracking-wider mb-3">Choose material</p>
              <div className="grid grid-cols-2 gap-1.5" id="materialGrid">
                {Object.keys(matThickness).map((flute) => (
                  <div
                    key={flute}
                    onClick={() => setSelectedMaterial(flute)}
                    className={`mat-option ${selectedMaterial === flute ? 'active' : ''}`}
                  >
                    {flute} - flute<br />
                    <span className="text-[10px] text-gray-400">{matThickness[flute]}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Size Mode */}
            <div className="mb-5">
              <p className="text-[11px] text-gray-400 font-semibold uppercase tracking-wider mb-3">Size mode</p>
              <div className="space-y-1.5">
                <div
                  className={`size-radio ${sizeMode === 'manufacture' ? 'active' : ''}`}
                  onClick={() => setSizeMode('manufacture')}
                >
                  <div className="dot"></div>
                  <span>Manufacture dimensions</span>
                </div>
                <div
                  className={`size-radio ${sizeMode === 'inner' ? 'active' : ''}`}
                  onClick={() => setSizeMode('inner')}
                >
                  <div className="dot"></div>
                  <span>Inner dimensions</span>
                </div>
              </div>
            </div>

            {/* Info Box */}
            <div className="bg-gray-50 rounded-lg p-3.5 border border-gray-100">
              <p className="text-[11px] text-gray-500 leading-relaxed">
                <i className="fas fa-info-circle text-gray-400 mr-1"></i>
                Dimensions shown are manufacture (die-cut) sizes. Inner dimensions may vary based on material thickness.
              </p>
            </div>
          </div>
        </aside>

        {/* ===== CENTER: 2D Dieline ===== */}
        <section
          ref={dielineSectionRef}
          className="flex-1 relative bg-white overflow-hidden fade-in"
          style={{ animationDelay: '.1s' }}
        >
          <canvas
            ref={canvasRef}
            className="absolute inset-0"
            style={{ cursor: draggingRef.current ? 'grabbing' : 'grab' }}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUpOrLeave}
            onMouseLeave={handleMouseUpOrLeave}
            onWheel={handleWheel}
          ></canvas>

          {/* Zoom Controls */}
          <div className="absolute bottom-4 right-4 flex items-center gap-1.5 bg-white/90 backdrop-blur-sm rounded-lg border border-gray-200 px-2 py-1.5 shadow-sm">
            <button
              onClick={() => setZoom((prev) => Math.max(0.15, prev / 1.25))}
              className="w-7 h-7 flex items-center justify-center text-gray-400 hover:text-gray-700 rounded transition text-xs"
              aria-label="Zoom out"
            >
              <i className="fas fa-minus"></i>
            </button>
            <span className="text-[11px] text-gray-500 font-medium w-10 text-center">
              {Math.round(zoom * 100)}%
            </span>
            <button
              onClick={() => setZoom((prev) => Math.min(5, prev * 1.25))}
              className="w-7 h-7 flex items-center justify-center text-gray-400 hover:text-gray-700 rounded transition text-xs"
              aria-label="Zoom in"
            >
              <i className="fas fa-plus"></i>
            </button>
            <div className="w-px h-4 bg-gray-200 mx-0.5"></div>
            <button
              onClick={() => { setZoom(1); panRef.current = { x: 0, y: 0 }; drawDieline(); }}
              className="w-7 h-7 flex items-center justify-center text-gray-400 hover:text-gray-700 rounded transition text-xs"
              aria-label="Reset"
            >
              <i className="fas fa-compress-arrows-alt"></i>
            </button>
          </div>

          {/* Dimension Info */}
          <div className="absolute bottom-4 left-4 text-[11px] text-gray-400 flex items-center gap-3">
            <span>
              <i className="fas fa-ruler-combined mr-1"></i>
              <span>{dim.L} × {dim.W} × {dim.H} mm</span>
            </span>
            <span>
              <i className="fas fa-layer-group mr-1"></i>
              {selectedMaterial} - flute ({matThickness[selectedMaterial]})
            </span>
          </div>
        </section>

        {/* ===== RIGHT PANEL: 3D + Downloads ===== */}
        <aside className="w-[308px] flex-shrink-0 border-l border-gray-100 flex flex-col bg-white fade-in" style={{ animationDelay: '.2s' }}>
          {/* 3D Preview */}
          <div className="flex-shrink-0" style={{ height: '46%' }}>
            <div className="px-4 pt-3 pb-2 flex items-center justify-between">
              <p className="text-[11px] text-gray-400 font-semibold uppercase tracking-wider">3D Preview</p>
              <p className="text-[10px] text-gray-300">Drag to rotate</p>
            </div>
            <div ref={threeContainerRef} className="relative" style={{ height: 'calc(100% - 36px)' }}></div>
          </div>

          <div className="border-t border-gray-100"></div>

          {/* File Formats */}
          <div className="flex-1 overflow-y-auto sidebar-scroll">
            <div className="p-4">
              <p className="text-[11px] text-gray-400 font-semibold uppercase tracking-wider mb-2">File formats</p>
              <div>
                {[
                  { id: 'AI', name: 'AI dieline', desc: 'Adobe Illustrator', icon: 'fa-pen-nib text-amber-500' },
                  { id: 'PDF', name: 'PDF dieline', desc: 'Portable Document', icon: 'fa-file-pdf text-red-500' },
                  { id: 'SVG', name: 'SVG dieline', desc: 'Scalable Vector', icon: 'fa-bezier-curve text-orange-500' },
                  { id: 'DXF', name: 'DXF dieline', desc: 'AutoCAD Exchange', icon: 'fa-drafting-compass text-sky-500' },
                  { id: 'CDR', name: 'CDR dieline', desc: 'CorelDRAW', icon: 'fa-palette text-purple-500' }
                ].map((fmt) => (
                  <div key={fmt.id} className="fmt-row">
                    <div className="flex items-center gap-2.5">
                      <i className={`fas ${fmt.icon} text-sm w-5 text-center`}></i>
                      <div>
                        <p className="text-[13px] font-medium text-gray-800">{fmt.name}</p>
                        <p className="text-[10px] text-gray-400">{fmt.desc}</p>
                      </div>
                    </div>
                    <button
                      onClick={() => fmt.id === 'SVG' ? downloadSVG() : triggerToast(`${fmt.id} dieline downloaded`)}
                      className="fmt-dl"
                      aria-label={`Download ${fmt.id}`}
                    >
                      <i className="fas fa-download"></i>
                    </button>
                  </div>
                ))}
              </div>

              {/* Instructions */}
              <div className="mt-4 pt-3 border-t border-gray-100">
                <p className="text-[11px] text-gray-400 leading-relaxed">
                  Click the download button next to your preferred format. The dieline file will be saved to your device, ready to use in your design software. All files include cut lines, fold lines, and bleed marks.
                </p>
              </div>
            </div>
          </div>
        </aside>
      </main>

      {/* Toast Alert */}
      <div className={`toast ${showToast ? 'show' : ''}`}>
        <i className="fas fa-check-circle text-emerald-400"></i>
        <span>{toastMsg}</span>
      </div>
    </div>
  );
}
