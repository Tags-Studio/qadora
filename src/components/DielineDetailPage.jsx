import React, { useState, useEffect, useRef } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import './DielineDetailPage.css';

export default function DielineDetailPage({ dieline, onBack }) {
  // Safe validation for dieline parameter to prevent crashes
  const safeDieline = dieline || { id: 1, name: 'Tuck End Box Dieline', category: 'folding', formats: ['AI', 'PDF', 'DXF'], image: '' };

  // Determine Box Type dynamically based on name
  const getBoxType = () => {
    if (!safeDieline.name) return 'box-tuck';
    const name = safeDieline.name.toLowerCase();
    if (name.includes('bag')) return 'bag';
    if (name.includes('drawer') || name.includes('slide')) return 'drawer';
    if (name.includes('rsc') || name.includes('slotted') || name.includes('fefco 0201') || name.includes('fefco 0300')) return 'box-rsc';
    if (name.includes('mailer') || name.includes('hinged') || name.includes('fefco 0427') || name.includes('fefco 0426') || name.includes('tray')) return 'box-mailer';
    return 'box-tuck'; // default
  };

  const boxType = getBoxType();

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

  // Dragging State
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

  // Adjust default dimensions based on box type for realistic proportion
  useEffect(() => {
    if (boxType === 'bag') {
      setDim({ L: 200, W: 80, H: 280 });
    } else if (boxType === 'box-rsc') {
      setDim({ L: 300, W: 200, H: 200 });
    } else if (boxType === 'drawer') {
      setDim({ L: 180, W: 130, H: 50 });
    } else if (boxType === 'box-mailer') {
      setDim({ L: 315, W: 202, H: 62 });
    } else { // box-tuck
      setDim({ L: 80, W: 80, H: 180 });
    }
    // Reset panning and zoom on card change
    panRef.current = { x: 0, y: 0 };
    setZoom(1);
  }, [safeDieline, boxType]);

  // Three.js variables
  const threeRef = useRef({
    scene: null,
    camera: null,
    renderer: null,
    controls: null,
    boxGrp: null,
    initialized: false,
  });

  // Load Font Awesome dynamically
  useEffect(() => {
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = 'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.0/css/all.min.css';
    document.head.appendChild(link);
    return () => {
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
    
    if (boxType === 'bag') {
      const tW = (L * 2) + (W * 2) + 20;
      const tH = H + (W * 0.7);
      return { tW, tH };
    }
    
    if (boxType === 'box-rsc') {
      const tW = (L * 2) + (W * 2) + 20;
      const tH = (W * 0.5) + H + (W * 0.5);
      return { tW, tH };
    }

    if (boxType === 'drawer') {
      const sleeveW = (L * 2) + (H * 2) + 20;
      const trayW = L + (H * 2);
      const tW = sleeveW + 40 + trayW;
      const tH = Math.max(W, W + (H * 2));
      return { tW, tH };
    }

    // Default Mailer/Tuck Box Geometry
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
    if (!canvas || !dielineSectionRef.current) return;
    const ctx = canvas.getContext('2d');
    const rect = dielineSectionRef.current.getBoundingClientRect();

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
    ctx.strokeStyle = '#222'; ctx.lineWidth = lw; ctx.fillStyle = '#fcfcf9';

    if (boxType === 'bag') {
      const { L, W, H } = dim;
      const bH = W * 0.6;
      ctx.fillRect(0, 0, L, H); ctx.strokeRect(0, 0, L, H);
      ctx.fillRect(L, 0, W, H); ctx.strokeRect(L, 0, W, H);
      ctx.fillRect(L+W, 0, L, H); ctx.strokeRect(L+W, 0, L, H);
      ctx.fillRect(L+W+L, 0, W, H); ctx.strokeRect(L+W+L, 0, W, H);
      
      ctx.beginPath();
      ctx.moveTo(L+W+L+W, 0); ctx.lineTo(L+W+L+W+20, 10);
      ctx.lineTo(L+W+L+W+20, H-10); ctx.lineTo(L+W+L+W, H);
      ctx.closePath(); ctx.fill(); ctx.stroke();

      ctx.fillRect(0, H, L, bH); ctx.strokeRect(0, H, L, bH);
      ctx.fillRect(L, H, W, bH); ctx.strokeRect(L, H, W, bH);
      ctx.fillRect(L+W, H, L, bH); ctx.strokeRect(L+W, H, L, bH);
      ctx.fillRect(L+W+L, H, W, bH); ctx.strokeRect(L+W+L, H, W, bH);

      ctx.strokeStyle = '#888'; ctx.lineWidth = dlw; ctx.setLineDash([5/sc, 3/sc]);
      ctx.beginPath();
      ctx.moveTo(L, 0); ctx.lineTo(L, H+bH);
      ctx.moveTo(L+W, 0); ctx.lineTo(L+W, H+bH);
      ctx.moveTo(L+W+L, 0); ctx.lineTo(L+W+L, H+bH);
      ctx.moveTo(L+W+L+W, 0); ctx.lineTo(L+W+L+W, H);
      ctx.moveTo(0, H); ctx.lineTo(L+W+L+W, H);
      ctx.moveTo(L+W/2, 0); ctx.lineTo(L+W/2, H);
      ctx.moveTo(L+W+L+W/2, 0); ctx.lineTo(L+W+L+W/2, H);
      ctx.stroke();

    } else if (boxType === 'box-rsc') {
      const { L, W, H } = dim;
      const fH = W * 0.5;
      
      ctx.fillRect(0, fH, L, H); ctx.strokeRect(0, fH, L, H);
      ctx.fillRect(L, fH, W, H); ctx.strokeRect(L, fH, W, H);
      ctx.fillRect(L+W, fH, L, H); ctx.strokeRect(L+W, fH, L, H);
      ctx.fillRect(L+W+L, fH, W, H); ctx.strokeRect(L+W+L, fH, W, H);

      ctx.beginPath();
      ctx.moveTo(L+W+L+W, fH); ctx.lineTo(L+W+L+W+20, fH+10);
      ctx.lineTo(L+W+L+W+20, fH+H-10); ctx.lineTo(L+W+L+W, fH+H);
      ctx.closePath(); ctx.fill(); ctx.stroke();

      ctx.fillRect(0, 0, L, fH); ctx.strokeRect(0, 0, L, fH);
      ctx.fillRect(L, 0, W, fH); ctx.strokeRect(L, 0, W, fH);
      ctx.fillRect(L+W, 0, L, fH); ctx.strokeRect(L+W, 0, L, fH);
      ctx.fillRect(L+W+L, 0, W, fH); ctx.strokeRect(L+W+L, 0, W, fH);

      ctx.fillRect(0, fH+H, L, fH); ctx.strokeRect(0, fH+H, L, fH);
      ctx.fillRect(L, fH+H, W, fH); ctx.strokeRect(L, fH+H, W, fH);
      ctx.fillRect(L+W, fH+H, L, fH); ctx.strokeRect(L+W, fH+H, L, fH);
      ctx.fillRect(L+W+L, fH+H, W, fH); ctx.strokeRect(L+W+L, fH+H, W, fH);

      ctx.strokeStyle = '#888'; ctx.lineWidth = dlw; ctx.setLineDash([5/sc, 3/sc]);
      ctx.beginPath();
      ctx.moveTo(L, 0); ctx.lineTo(L, fH+H+fH);
      ctx.moveTo(L+W, 0); ctx.lineTo(L+W, fH+H+fH);
      ctx.moveTo(L+W+L, 0); ctx.lineTo(L+W+L, fH+H+fH);
      ctx.moveTo(L+W+L+W, fH); ctx.lineTo(L+W+L+W, fH+H);
      ctx.moveTo(0, fH); ctx.lineTo(L+W+L+W, fH);
      ctx.moveTo(0, fH+H); ctx.lineTo(L+W+L+W, fH+H);
      ctx.stroke();

    } else if (boxType === 'drawer') {
      const { L, W, H } = dim;
      const slW = (L * 2) + (H * 2);
      ctx.fillRect(0, 0, L, W); ctx.strokeRect(0, 0, L, W);
      ctx.fillRect(L, 0, H, W); ctx.strokeRect(L, 0, H, W);
      ctx.fillRect(L+H, 0, L, W); ctx.strokeRect(L+H, 0, L, W);
      ctx.fillRect(L+H+L, 0, H, W); ctx.strokeRect(L+H+L, 0, H, W);
      ctx.fillRect(slW, 5, 20, W-10); ctx.strokeRect(slW, 5, 20, W-10);

      const trX = slW + 60;
      ctx.fillRect(trX + H, H, L, W); ctx.strokeRect(trX + H, H, L, W);
      ctx.fillRect(trX, H, H, W); ctx.strokeRect(trX, H, H, W);
      ctx.fillRect(trX + H + L, H, H, W); ctx.strokeRect(trX + H + L, H, H, W);
      ctx.fillRect(trX + H, 0, L, H); ctx.strokeRect(trX + H, 0, L, H);
      ctx.fillRect(trX + H, H + W, L, H); ctx.strokeRect(trX + H, H + W, L, H);

      ctx.strokeStyle = '#888'; ctx.lineWidth = dlw; ctx.setLineDash([5/sc, 3/sc]);
      ctx.beginPath();
      ctx.moveTo(L, 0); ctx.lineTo(L, W);
      ctx.moveTo(L+H, 0); ctx.lineTo(L+H, W);
      ctx.moveTo(L+H+L, 0); ctx.lineTo(L+H+L, W);
      ctx.moveTo(slW, 0); ctx.lineTo(slW, W);
      ctx.moveTo(trX + H, H); ctx.lineTo(trX + H, H + W);
      ctx.moveTo(trX + H + L, H); ctx.lineTo(trX + H + L, H + W);
      ctx.moveTo(trX + H, H); ctx.lineTo(trX + H + L, H);
      ctx.moveTo(trX + H, H + W); ctx.lineTo(trX + H + L, H + W);
      ctx.stroke();

    } else if (boxType === 'box-tuck') {
      const { L, W, H } = dim;
      const topFlap = W * 0.8;
      
      ctx.fillRect(0, topFlap, L, H); ctx.strokeRect(0, topFlap, L, H);
      ctx.fillRect(L, topFlap, W, H); ctx.strokeRect(L, topFlap, W, H);
      ctx.fillRect(L+W, topFlap, L, H); ctx.strokeRect(L+W, topFlap, L, H);
      ctx.fillRect(L+W+L, topFlap, W, H); ctx.strokeRect(L+W+L, topFlap, W, H);
      ctx.fillRect(L+W+L+W, topFlap + 10, 15, H - 20); ctx.strokeRect(L+W+L+W, topFlap + 10, 15, H - 20);

      ctx.fillRect(0, topFlap * 0.3, L, topFlap * 0.7); ctx.strokeRect(0, topFlap * 0.3, L, topFlap * 0.7);
      ctx.fillRect(0, 0, L, topFlap * 0.3); ctx.strokeRect(0, 0, L, topFlap * 0.3);

      ctx.fillRect(L+W, topFlap+H, L, topFlap * 0.7); ctx.strokeRect(L+W, topFlap+H, L, topFlap * 0.7);
      ctx.fillRect(L+W, topFlap+H+topFlap*0.7, L, topFlap * 0.3); ctx.strokeRect(L+W, topFlap+H+topFlap*0.7, L, topFlap * 0.3);

      ctx.fillRect(L, topFlap * 0.3, W, topFlap * 0.7); ctx.strokeRect(L, topFlap * 0.3, W, topFlap * 0.7);
      ctx.fillRect(L+W+L, topFlap * 0.3, W, topFlap * 0.7); ctx.strokeRect(L+W+L, topFlap * 0.3, W, topFlap * 0.7);

      ctx.strokeStyle = '#888'; ctx.lineWidth = dlw; ctx.setLineDash([5/sc, 3/sc]);
      ctx.beginPath();
      ctx.moveTo(L, topFlap); ctx.lineTo(L, topFlap + H);
      ctx.moveTo(L+W, topFlap); ctx.lineTo(L+W, topFlap + H);
      ctx.moveTo(L+W+L, topFlap); ctx.lineTo(L+W+L, topFlap + H);
      ctx.moveTo(0, topFlap); ctx.lineTo(L+W+L+W, topFlap);
      ctx.moveTo(0, topFlap+H); ctx.lineTo(L+W+L+W, topFlap+H);
      ctx.moveTo(0, topFlap*0.3); ctx.lineTo(L, topFlap*0.3);
      ctx.moveTo(L+W, topFlap+H+topFlap*0.7); ctx.lineTo(L+W+L, topFlap+H+topFlap*0.7);
      ctx.stroke();

    } else {
      // 5. MAILER BOX DIELINE (ORIGINAL CODE)
      const { glW, duH, liH, tuH, boH, dI, gI, xG, xS1, xF, xB, xS2, yTu, yLi, yDuT, mY, yBo } = g;
      const { L, W, H } = dim;

      ctx.fillRect(xS1, mY, W, H); ctx.strokeRect(xS1, mY, W, H);
      ctx.fillRect(xF, mY, L, H); ctx.strokeRect(xF, mY, L, H);
      ctx.fillRect(xB, mY, L, H); ctx.strokeRect(xB, mY, L, H);
      ctx.fillRect(xS2, mY, W, H); ctx.strokeRect(xS2, mY, W, H);
      ctx.fillRect(xB, yLi, L, liH); ctx.strokeRect(xB, yLi, L, liH);

      ctx.beginPath();
      ctx.moveTo(xB, yLi);
      ctx.lineTo(xB + L, yLi);
      ctx.lineTo(xB + L, yLi * 0.38);
      ctx.quadraticCurveTo(xB + L / 2, yTu - tuH * 0.15, xB, yLi * 0.38);
      ctx.closePath(); ctx.fill(); ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(xS1 + dI, yDuT); ctx.lineTo(xS1 + W - dI, yDuT);
      ctx.lineTo(xS1 + W, mY); ctx.lineTo(xS1, mY);
      ctx.closePath(); ctx.fill(); ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(xS2 + dI, yDuT); ctx.lineTo(xS2 + W - dI, yDuT);
      ctx.lineTo(xS2 + W, mY); ctx.lineTo(xS2, mY);
      ctx.closePath(); ctx.fill(); ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(xS1, yBo); ctx.lineTo(xS1 + W, yBo);
      ctx.lineTo(xS1 + W - dI, yBo + boH); ctx.lineTo(xS1 + dI, yBo + boH);
      ctx.closePath(); ctx.fill(); ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(xS2, yBo); ctx.lineTo(xS2 + W, yBo);
      ctx.lineTo(xS2 + W - dI, yBo + boH); ctx.lineTo(xS2 + dI, yBo + boH);
      ctx.closePath(); ctx.fill(); ctx.stroke();

      ctx.fillRect(xF, yBo, L, boH); ctx.strokeRect(xF, yBo, L, boH);
      
      ctx.beginPath();
      ctx.moveTo(xG, mY); ctx.lineTo(xG + glW, mY + gI);
      ctx.lineTo(xG + glW, mY + H - gI); ctx.lineTo(xG, mY + H);
      ctx.closePath(); ctx.fill(); ctx.stroke();

      ctx.strokeStyle = '#888'; ctx.lineWidth = dlw;
      ctx.setLineDash([5 / sc, 3 / sc]);
      const foldLine = (x1, y1, x2, y2) => { ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke(); };
      foldLine(xS1, mY, xS1, mY + H);
      foldLine(xF, mY, xF, mY + H);
      foldLine(xB, mY, xB, mY + H);
      foldLine(xS2, mY, xS2, mY + H);
      foldLine(xS1, mY, xS2 + W, mY);
      foldLine(xS1, mY + H, xS2 + W, mY + H);
      foldLine(xB, yLi, xB + L, yLi);
      ctx.setLineDash([]);
    }

    // Draw dimension annotations (L, W, H)
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

    if (boxType === 'bag') {
      const { L, W, H } = dim;
      arrowLine(0, H + W * 0.6 + off, L, H + W * 0.6 + off, `${L} mm`, L / 2, H + W * 0.6 + off + 11 / sc);
      arrowLine(-off, 0, -off, H, `${H} mm`, -off - 14 / sc, H / 2);
    } else if (boxType === 'box-rsc') {
      const { L, W, H } = dim;
      arrowLine(0, (W * 0.5) + H + (W * 0.5) + off, L, (W * 0.5) + H + (W * 0.5) + off, `${L} mm`, L / 2, (W * 0.5) + H + (W * 0.5) + off + 11 / sc);
      arrowLine(-off, W * 0.5, -off, W * 0.5 + H, `${H} mm`, -off - 14 / sc, W * 0.5 + H / 2);
    } else if (boxType === 'drawer') {
      const { L, W, H } = dim;
      arrowLine(0, W + off, L, W + off, `${L} mm`, L / 2, W + off + 11 / sc);
      arrowLine(L + off, 0, L + off, W, `${W} mm`, L + off + 14 / sc, W / 2);
    } else {
      const { L, W, H } = dim;
      const startX = boxType === 'box-tuck' ? 0 : g.xF;
      const startY = boxType === 'box-tuck' ? W * 0.8 : g.mY;
      arrowLine(startX, startY + H + off, startX + L, startY + H + off, `${L} mm`, startX + L / 2, startY + H + off + 11 / sc);
      arrowLine(startX - off, startY, startX - off, startY + H, `${H} mm`, startX - off - 14 / sc, startY + H / 2);
    }

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
  }, [dim, zoom, boxType]);

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

    if (boxType === 'bag') {
      addPanel(new THREE.BoxGeometry(l, h, w * 0.3), new THREE.Vector3(0, h / 2, 0));
      const handleGeo = new THREE.TorusGeometry(l * 0.25, 0.015, 8, 24, Math.PI);
      const handleMat = new THREE.MeshBasicMaterial({ color: 0xc4b7a6 });
      const handle1 = new THREE.Mesh(handleGeo, handleMat);
      handle1.position.set(0, h, w * 0.15);
      three.boxGrp.add(handle1);
      const handle2 = new THREE.Mesh(handleGeo, handleMat);
      handle2.position.set(0, h, -w * 0.15);
      three.boxGrp.add(handle2);

    } else if (boxType === 'drawer') {
      addPanel(new THREE.PlaneGeometry(l, w), new THREE.Vector3(0, h, 0), { x: -Math.PI / 2 }, matS);
      addPanel(new THREE.PlaneGeometry(l, w), new THREE.Vector3(0, 0, 0), { x: Math.PI / 2 }, matS);
      addPanel(new THREE.PlaneGeometry(w, h), new THREE.Vector3(-l / 2, h / 2, 0), { y: -Math.PI / 2 }, matS);
      addPanel(new THREE.PlaneGeometry(w, h), new THREE.Vector3(l / 2, h / 2, 0), { y: Math.PI / 2 }, matS);
      
      const trGrp = new THREE.Group();
      trGrp.position.set(l * 0.35, 0.01, 0);
      const tl = l * 0.96; const tw = w * 0.96; const th = h * 0.94;
      const tMesh = new THREE.Mesh(new THREE.BoxGeometry(tl, th, tw), mat);
      tMesh.position.set(0, th / 2, 0);
      trGrp.add(tMesh);
      three.boxGrp.add(trGrp);

    } else if (boxType === 'box-rsc') {
      addPanel(new THREE.BoxGeometry(l, h, w), new THREE.Vector3(0, h / 2, 0));

    } else if (boxType === 'box-tuck') {
      // 3D Tuck End Box (Tall folding carton)
      addPanel(new THREE.PlaneGeometry(l, h), new THREE.Vector3(0, h / 2, w / 2), null);
      addPanel(new THREE.PlaneGeometry(l, h), new THREE.Vector3(0, h / 2, -w / 2), { y: Math.PI });
      addPanel(new THREE.PlaneGeometry(w, h), new THREE.Vector3(-l / 2, h / 2, 0), { y: -Math.PI / 2 }, matS);
      addPanel(new THREE.PlaneGeometry(w, h), new THREE.Vector3(l / 2, h / 2, 0), { y: Math.PI / 2 }, matS);
      addPanel(new THREE.PlaneGeometry(l, w), new THREE.Vector3(0, 0, 0), { x: -Math.PI / 2 }, matS);

      // Top Lid (Opens up)
      const topLidGrp = new THREE.Group();
      topLidGrp.position.set(0, h, w / 2);
      const lidMesh = new THREE.Mesh(new THREE.PlaneGeometry(l, w), mat);
      lidMesh.position.set(0, 0, -w / 2);
      lidMesh.rotation.x = -Math.PI / 2;
      topLidGrp.add(lidMesh);
      topLidGrp.rotation.x = 0.5; // Open angle
      three.boxGrp.add(topLidGrp);

      // Bottom Lid
      addPanel(new THREE.PlaneGeometry(l, w), new THREE.Vector3(0, 0, 0), { x: Math.PI / 2 }, matS);

    } else {
      // Mailer Box (Default)
      addPanel(new THREE.PlaneGeometry(l, h), new THREE.Vector3(0, h / 2, w / 2), null);
      addPanel(new THREE.PlaneGeometry(l, h), new THREE.Vector3(0, h / 2, -w / 2), { y: Math.PI });
      addPanel(new THREE.PlaneGeometry(w, h), new THREE.Vector3(-l / 2, h / 2, 0), { y: -Math.PI / 2 }, matS);
      addPanel(new THREE.PlaneGeometry(w, h), new THREE.Vector3(l / 2, h / 2, 0), { y: Math.PI / 2 }, matS);
      addPanel(new THREE.PlaneGeometry(l, w), new THREE.Vector3(0, 0, 0), { x: -Math.PI / 2 }, matS);

      const lidGrp = new THREE.Group();
      lidGrp.position.set(0, h, -w / 2);
      const lidMat = new THREE.MeshStandardMaterial({ color: 0xf2eee6, side: THREE.DoubleSide, roughness: 0.85, metalness: 0 });
      const lidMesh = new THREE.Mesh(new THREE.PlaneGeometry(l, w), lidMat);
      lidMesh.position.set(0, 0, w / 2);
      lidMesh.rotation.x = -Math.PI / 2;
      lidMesh.castShadow = true;
      lidGrp.add(lidMesh);

      const lidEdge = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.PlaneGeometry(l, w)), edgeM);
      lidEdge.position.copy(lidMesh.position); lidEdge.rotation.copy(lidMesh.rotation);
      lidGrp.add(lidEdge);

      const tuck = new THREE.Mesh(new THREE.PlaneGeometry(l, w * 0.08), lidMat);
      tuck.position.set(0, -w * 0.04, w);
      tuck.castShadow = true;
      lidGrp.add(tuck);
      lidGrp.rotation.x = -0.5;
      three.boxGrp.add(lidGrp);
    }

    three.scene.add(three.boxGrp);

    const md = Math.max(l, w, h);
    three.camera.position.set(md * 1.2, md * 1.0, md * 1.2);
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
  }, [safeDieline, boxType]); // Re-initialize 3D context when dieline or boxType changes

  // Update geometry when dim changes
  useEffect(() => {
    updateThreeGeom();
  }, [dim, boxType]);

  // ========== SVG Exporter ==========
  const downloadSVG = () => {
    const g = getGeom();
    let s = `<svg xmlns="http://www.w3.org/2000/svg" width="${g.tW}" height="${g.tH}" viewBox="0 0 ${g.tW} ${g.tH}">`;
    s += `<rect x="0" y="0" width="${g.tW}" height="${g.tH}" fill="#fff"/>`;
    const { L, W, H } = dim;
    if (boxType === 'bag') {
      s += `<rect x="0" y="0" width="${L}" height="${H}" fill="none" stroke="#222" stroke-width="1"/>`;
      s += `<rect x="${L}" y="0" width="${W}" height="${H}" fill="none" stroke="#222" stroke-width="1"/>`;
      s += `<rect x="${L+W}" y="0" width="${L}" height="${H}" fill="none" stroke="#222" stroke-width="1"/>`;
      s += `<rect x="${L+W+L}" y="0" width="${W}" height="${H}" fill="none" stroke="#222" stroke-width="1"/>`;
    } else if (boxType === 'box-rsc') {
      const fH = W * 0.5;
      s += `<rect x="0" y="${fH}" width="${L}" height="${H}" fill="none" stroke="#222" stroke-width="1"/>`;
      s += `<rect x="${L}" y="${fH}" width="${W}" height="${H}" fill="none" stroke="#222" stroke-width="1"/>`;
      s += `<rect x="${L+W}" y="${fH}" width="${L}" height="${H}" fill="none" stroke="#222" stroke-width="1"/>`;
      s += `<rect x="${L+W+L}" y="${fH}" width="${W}" height="${H}" fill="none" stroke="#222" stroke-width="1"/>`;
    } else {
      s += `<rect x="0" y="0" width="${L}" height="${H}" fill="none" stroke="#222" stroke-width="1"/>`;
    }
    s += `</svg>`;
    const blob = new Blob([s], { type: 'image/svg+xml' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `${safeDieline.name.toLowerCase().replace(/\s+/g, '-')}.${boxType}.svg`;
    a.click();
    URL.revokeObjectURL(a.href);
    triggerToast('SVG dieline downloaded');
  };

  return (
    <div className="dieline-detail-layout">
      {/* Header */}
      <header className="detail-header">
        <button onClick={onBack} className="logo-btn">
          PACDORA
        </button>
        <nav className="header-nav">
          <a href="#" className="nav-item">Dielines</a>
          <a href="#" className="nav-item">3D Viewer</a>
          <a href="#" className="nav-item">Resources</a>
          <a href="#" className="nav-item">Pricing</a>
        </nav>
        <div className="header-actions">
          <a href="#" className="action-link">Sign In</a>
          <a href="#" className="action-btn">Get Started</a>
        </div>
      </header>

      {/* 3-Column Layout */}
      <main className="detail-main-content">
        
        {/* ===== LEFT PANEL: Settings ===== */}
        <aside className="settings-sidebar sidebar-scroll">
          <div className="settings-container">
            <div className="title-block">
              <p className="subtitle">Customizable {boxType.toUpperCase()}</p>
              <h1 className="main-title">{safeDieline.name}</h1>
            </div>

            {/* Custom Size Inputs */}
            <div className="settings-group">
              <p className="group-title">Custom size</p>
              <div className="inputs-stack">
                <div className="input-field-row">
                  <label className="input-lbl">Length (L)</label>
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
                <div className="input-field-row">
                  <label className="input-lbl">Width (W)</label>
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
                <div className="input-field-row">
                  <label className="input-lbl">Height / Depth (H)</label>
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
            <div className="settings-group">
              <p className="group-title">Choose material</p>
              <div className="flute-grid">
                {Object.keys(matThickness).map((flute) => (
                  <div
                    key={flute}
                    onClick={() => setSelectedMaterial(flute)}
                    className={`mat-option ${selectedMaterial === flute ? 'active' : ''}`}
                  >
                    {flute} - flute<br />
                    <span className="flute-thickness">{matThickness[flute]}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Size Mode */}
            <div className="settings-group">
              <p className="group-title">Size mode</p>
              <div className="radio-group">
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
            <div className="info-badge-box">
              <p className="info-desc">
                <i className="fas fa-info-circle info-icon"></i>
                Dimensions shown are manufacture (die-cut) sizes. Inner dimensions may vary based on material thickness.
              </p>
            </div>
          </div>
        </aside>

        {/* ===== CENTER: 2D Dieline ===== */}
        <section
          ref={dielineSectionRef}
          className="canvas-viewport"
        >
          <canvas
            ref={canvasRef}
            className="canvas-2d-element"
            style={{ cursor: draggingRef.current ? 'grabbing' : 'grab' }}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUpOrLeave}
            onMouseLeave={handleMouseUpOrLeave}
            onWheel={handleWheel}
          ></canvas>

          {/* Zoom Controls */}
          <div className="zoom-controls-overlay">
            <button
              onClick={() => setZoom((prev) => Math.max(0.15, prev / 1.25))}
              className="zoom-btn"
              aria-label="Zoom out"
            >
              <i className="fas fa-minus"></i>
            </button>
            <span className="zoom-value-label">
              {Math.round(zoom * 100)}%
            </span>
            <button
              onClick={() => setZoom((prev) => Math.min(5, prev * 1.25))}
              className="zoom-btn"
              aria-label="Zoom in"
            >
              <i className="fas fa-plus"></i>
            </button>
            <div className="zoom-divider"></div>
            <button
              onClick={() => { setZoom(1); panRef.current = { x: 0, y: 0 }; drawDieline(); }}
              className="zoom-btn"
              aria-label="Reset"
            >
              <i className="fas fa-compress-arrows-alt"></i>
            </button>
          </div>

          {/* Dimension Info */}
          <div className="dimensions-status-overlay">
            <span>
              <i className="fas fa-ruler-combined"></i>
              <span>{dim.L} × {dim.W} × {dim.H} mm</span>
            </span>
            <span>
              <i className="fas fa-layer-group"></i>
              {selectedMaterial} - flute ({matThickness[selectedMaterial]})
            </span>
          </div>
        </section>

        {/* ===== RIGHT PANEL: 3D + Downloads ===== */}
        <aside className="preview-sidebar">
          {/* 3D Preview */}
          <div className="three-preview-panel">
            <div className="three-panel-header">
              <p className="three-title">3D Preview</p>
              <p className="three-hint">Drag to rotate</p>
            </div>
            <div ref={threeContainerRef} className="three-canvas-holder"></div>
          </div>

          <div className="sidebar-divider"></div>

          {/* File Formats */}
          <div className="formats-panel-scroll sidebar-scroll">
            <div className="formats-container">
              <p className="formats-title">File formats</p>
              <div className="formats-list">
                {[
                  { id: 'AI', name: 'AI dieline', desc: 'Adobe Illustrator', icon: 'fa-pen-nib text-amber-500' },
                  { id: 'PDF', name: 'PDF dieline', desc: 'Portable Document', icon: 'fa-file-pdf text-red-500' },
                  { id: 'SVG', name: 'SVG dieline', desc: 'Scalable Vector', icon: 'fa-bezier-curve text-orange-500' },
                  { id: 'DXF', name: 'DXF dieline', desc: 'AutoCAD Exchange', icon: 'fa-drafting-compass text-sky-500' },
                  { id: 'CDR', name: 'CDR dieline', desc: 'CorelDRAW', icon: 'fa-palette text-purple-500' }
                ].map((fmt) => (
                  <div key={fmt.id} className="fmt-row">
                    <div className="fmt-info-col">
                      <i className={`fas ${fmt.icon} fmt-icon-type`}></i>
                      <div>
                        <p className="fmt-name">{fmt.name}</p>
                        <p className="fmt-desc">{fmt.desc}</p>
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
              <div className="instructions-box">
                <p className="instructions-desc">
                  Click the download button next to your preferred format. The dieline file will be saved to your device, ready to use in your design software. All files include cut lines, fold lines, and bleed marks.
                </p>
              </div>
            </div>
          </div>
        </aside>
      </main>

      {/* Toast Alert */}
      <div className={`toast ${showToast ? 'show' : ''}`}>
        <i className="fas fa-check-circle toast-check-icon"></i>
        <span>{toastMsg}</span>
      </div>
    </div>
  );
}
