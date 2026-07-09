// ============================================================================
//  Parametric dieline generators
//  Each generator returns { cut:[svgPaths], crease:[svgPaths], annotations, width, height }
//  Coordinates are in millimetres (SVG user units); the viewport scales to fit.
// ============================================================================

// Rounded tuck-flap helper (returns a path from (x0) across width w with radius r)
function tuckTop(x, yBase, w, depth, tr) {
  const yTip = yBase - depth;
  return `M ${x} ${yBase} L ${x} ${yTip + tr} Q ${x} ${yTip} ${x + tr} ${yTip} L ${x + w - tr} ${yTip} Q ${x + w} ${yTip} ${x + w} ${yTip + tr} L ${x + w} ${yBase}`;
}
function tuckBottom(x, yBase, w, depth, tr) {
  const yTip = yBase + depth;
  return `M ${x} ${yBase} L ${x} ${yTip - tr} Q ${x} ${yTip} ${x + tr} ${yTip} L ${x + w - tr} ${yTip} Q ${x + w} ${yTip} ${x + w} ${yTip - tr} L ${x + w} ${yBase}`;
}
// Trapezoid dust/side flap
function dustFlapUp(x, yBase, w, depth, inset) {
  const yTip = yBase - depth;
  return `M ${x} ${yBase} L ${x + inset} ${yTip} L ${x + w - inset} ${yTip} L ${x + w} ${yBase}`;
}
function dustFlapDown(x, yBase, w, depth, inset) {
  const yTip = yBase + depth;
  return `M ${x} ${yBase} L ${x + inset} ${yTip} L ${x + w - inset} ${yTip} L ${x + w} ${yBase}`;
}

// ---------------------------------------------------------------------------
// 1. MAILER BOX (roll-over / hinged lid)
// ---------------------------------------------------------------------------
export function generateMailer(L, W, H, T) {
  const G = 20, gt = 8, dt = Math.min(12, W / 15), tr = Math.min(10, L / 20);
  const tfh = L / 2, sfh = W / 2, bfh = L / 2;
  const atw = Math.min(25, W / 5), ath = Math.min(20, bfh / 3);
  const atOff = (W - 2 * atw) / 3;
  const xF = G, xR = G + W, xB = G + W + L, xL = G + 2 * W + L, xE = G + 2 * W + 2 * L;
  const yPT = tfh, yPB = tfh + H, yBot = tfh + H + bfh;
  const yST = tfh - sfh, ySB = tfh + H + sfh;
  const cut = [], crease = [];

  cut.push(`M 0 ${yPT - gt} L ${G} ${yPT} L ${G} ${yPB} L 0 ${yPB + gt} Z`);
  cut.push(`M ${xF} ${yPT} L ${xF} ${tr} Q ${xF} 0 ${xF + tr} 0 L ${xF + W - tr} 0 Q ${xF + W} 0 ${xF + W} ${tr} L ${xF + W} ${yPT}`);
  cut.push(`M ${xR} ${yPT} L ${xR + dt} ${yST} L ${xR + L - dt} ${yST} L ${xR + L} ${yPT}`);
  cut.push(`M ${xB} ${yPT} L ${xB} ${tr} Q ${xB} 0 ${xB + tr} 0 L ${xB + W - tr} 0 Q ${xB + W} 0 ${xB + W} ${tr} L ${xB + W} ${yPT}`);
  cut.push(`M ${xL} ${yPT} L ${xL + dt} ${yST} L ${xL + L - dt} ${yST} L ${xL + L} ${yPT}`);
  cut.push(`M ${xE} ${yPT} L ${xE} ${yPB}`);

  const t1a = xF + atOff, t1b = t1a + atw, t2a = xF + 2 * atOff + atw, t2b = t2a + atw;
  const bfy = yBot - ath;
  cut.push(`M ${xF} ${yPB} L ${xF} ${bfy} L ${t1a} ${bfy} L ${t1a + 3} ${yBot} L ${t1b - 3} ${yBot} L ${t1b} ${bfy} L ${t2a} ${bfy} L ${t2a + 3} ${yBot} L ${t2b - 3} ${yBot} L ${t2b} ${bfy} L ${xF + W} ${bfy} L ${xF + W} ${yPB}`);
  cut.push(`M ${xR} ${yPB} L ${xR + dt} ${ySB} L ${xR + L - dt} ${ySB} L ${xR + L} ${yPB}`);

  const s1a = xB + atOff + 1, s1b = s1a + atw + 2, s2a = xB + 2 * atOff + atw + 1, s2b = s2a + atw + 2;
  const slotD = ath + 4;
  cut.push(`M ${xB} ${yPB} L ${xB} ${yBot} L ${s1a} ${yBot} L ${s1a} ${yBot - slotD} L ${s1b} ${yBot - slotD} L ${s1b} ${yBot} L ${s2a} ${yBot} L ${s2a} ${yBot - slotD} L ${s2b} ${yBot - slotD} L ${s2b} ${yBot} L ${xB + W} ${yBot} L ${xB + W} ${yPB}`);
  cut.push(`M ${xL} ${yPB} L ${xL + dt} ${ySB} L ${xL + L - dt} ${ySB} L ${xL + L} ${yPB}`);

  crease.push(`M ${xF} ${yPT} L ${xF} ${yPB}`, `M ${xR} ${yPT} L ${xR} ${yPB}`, `M ${xB} ${yPT} L ${xB} ${yPB}`, `M ${xL} ${yPT} L ${xL} ${yPB}`);
  crease.push(`M ${xF} ${yPT} L ${xE} ${yPT}`, `M ${xF} ${yPB} L ${xE} ${yPB}`);

  const ann = [
    { text: 'Front', x: xF + W / 2, y: yPT + H / 2 }, { text: 'Right', x: xR + L / 2, y: yPT + H / 2 },
    { text: 'Back', x: xB + W / 2, y: yPT + H / 2 }, { text: 'Left', x: xL + L / 2, y: yPT + H / 2 },
    { text: W + '', x: xF + W / 2, y: yPT + H + 12, dim: 'w' }, { text: L + '', x: xR + L / 2, y: yPT + H + 12, dim: 'l' },
    { text: H + '', x: xF - 12, y: yPT + H / 2, dim: 'h', rotate: true },
  ];
  return { cut, crease, width: xE, height: yBot, annotations: ann };
}

// ---------------------------------------------------------------------------
// 2. STRAIGHT TUCK-END carton
// ---------------------------------------------------------------------------
export function generateStraightTuck(L, W, H, T) {
  const G = 20, gt = 8, dt = Math.min(12, W / 15), tr = Math.min(10, L / 20);
  const tfh = L / 2 + T, sfh = W / 2 + T, bfh = L / 2 + T;
  const xF = G, xR = G + W, xB = G + W + L, xL = G + 2 * W + L, xE = G + 2 * W + 2 * L;
  const yPT = tfh, yPB = tfh + H, yBot = tfh + H + bfh, yST = tfh - sfh, ySB = tfh + H + sfh;
  const cut = [], crease = [];

  cut.push(`M 0 ${yPT - gt} L ${G} ${yPT} L ${G} ${yPB} L 0 ${yPB + gt} Z`);
  cut.push(tuckTop(xF, yPT, W, tfh, tr));
  cut.push(dustFlapUp(xR, yPT, L, sfh, dt));
  cut.push(tuckTop(xB, yPT, W, tfh, tr));
  cut.push(dustFlapUp(xL, yPT, L, sfh, dt));
  cut.push(`M ${xE} ${yPT} L ${xE} ${yPB}`);

  cut.push(tuckBottom(xF, yPB, W, bfh, tr));
  cut.push(dustFlapDown(xR, yPB, L, sfh, dt));
  cut.push(tuckBottom(xB, yPB, W, bfh, tr));
  cut.push(dustFlapDown(xL, yPB, L, sfh, dt));

  crease.push(`M ${xF} ${yPT} L ${xF} ${yPB}`, `M ${xR} ${yPT} L ${xR} ${yPB}`, `M ${xB} ${yPT} L ${xB} ${yPB}`, `M ${xL} ${yPT} L ${xL} ${yPB}`);
  crease.push(`M ${xF} ${yPT} L ${xE} ${yPT}`, `M ${xF} ${yPB} L ${xE} ${yPB}`);

  const ann = [
    { text: 'Front', x: xF + W / 2, y: yPT + H / 2 }, { text: 'Right', x: xR + L / 2, y: yPT + H / 2 },
    { text: 'Back', x: xB + W / 2, y: yPT + H / 2 }, { text: 'Left', x: xL + L / 2, y: yPT + H / 2 },
    { text: W + '', x: xF + W / 2, y: yPT + H + 12, dim: 'w' }, { text: L + '', x: xR + L / 2, y: yPT + H + 12, dim: 'l' },
    { text: H + '', x: xF - 12, y: yPT + H / 2, dim: 'h', rotate: true },
  ];
  return { cut, crease, width: xE, height: yBot, annotations: ann };
}

// ---------------------------------------------------------------------------
// 3. REVERSE TUCK-END carton
// ---------------------------------------------------------------------------
export function generateReverseTuck(L, W, H, T) {
  const G = 20, gt = 8, dt = Math.min(12, W / 15), tr = Math.min(10, L / 20);
  const tfh = L / 2 + T, sfh = W / 2 + T, bfh = L / 2 + T;
  const xF = G, xR = G + W, xB = G + W + L, xL = G + 2 * W + L, xE = G + 2 * W + 2 * L;
  const yPT = tfh, yPB = tfh + H, yBot = tfh + H + bfh, yST = tfh - sfh, ySB = tfh + H + sfh;
  const cut = [], crease = [];

  cut.push(`M 0 ${yPT - gt} L ${G} ${yPT} L ${G} ${yPB} L 0 ${yPB + gt} Z`);
  cut.push(dustFlapUp(xF, yPT, W, tfh, tr));       // reversed: tuck on back/left
  cut.push(tuckTop(xR, yPT, L, sfh, dt));
  cut.push(dustFlapUp(xB, yPT, W, tfh, tr));
  cut.push(tuckTop(xL, yPT, L, sfh, dt));
  cut.push(`M ${xE} ${yPT} L ${xE} ${yPB}`);

  cut.push(tuckBottom(xF, yPB, W, bfh, tr));
  cut.push(dustFlapDown(xR, yPB, L, sfh, dt));
  cut.push(tuckBottom(xB, yPB, W, bfh, tr));
  cut.push(dustFlapDown(xL, yPB, L, sfh, dt));

  crease.push(`M ${xF} ${yPT} L ${xF} ${yPB}`, `M ${xR} ${yPT} L ${xR} ${yPB}`, `M ${xB} ${yPT} L ${xB} ${yPB}`, `M ${xL} ${yPT} L ${xL} ${yPB}`);
  crease.push(`M ${xF} ${yPT} L ${xE} ${yPT}`, `M ${xF} ${yPB} L ${xE} ${yPB}`);

  const ann = [
    { text: 'Front', x: xF + W / 2, y: yPT + H / 2 }, { text: 'Right', x: xR + L / 2, y: yPT + H / 2 },
    { text: 'Back', x: xB + W / 2, y: yPT + H / 2 }, { text: 'Left', x: xL + L / 2, y: yPT + H / 2 },
    { text: W + '', x: xF + W / 2, y: yPT + H + 12, dim: 'w' }, { text: L + '', x: xR + L / 2, y: yPT + H + 12, dim: 'l' },
    { text: H + '', x: xF - 12, y: yPT + H / 2, dim: 'h', rotate: true },
  ];
  return { cut, crease, width: xE, height: yBot, annotations: ann };
}

// ---------------------------------------------------------------------------
// 4. AUTO-LOCK (crash-lock) bottom carton
// ---------------------------------------------------------------------------
export function generateAutoLock(L, W, H, T) {
  const G = 20, gt = 8, dt = Math.min(12, W / 15), tr = Math.min(10, L / 20);
  const tfh = L / 2 + T, sfh = W / 2 + T;
  const xF = G, xR = G + W, xB = G + W + L, xL = G + 2 * W + L, xE = G + 2 * W + 2 * L;
  const yPT = tfh, yPB = tfh + H;
  const cut = [], crease = [];

  // Top = straight tuck
  cut.push(`M 0 ${yPT - gt} L ${G} ${yPT} L ${G} ${yPB} L 0 ${yPB + gt} Z`);
  cut.push(tuckTop(xF, yPT, W, tfh, tr));
  cut.push(dustFlapUp(xR, yPT, L, sfh, dt));
  cut.push(tuckTop(xB, yPT, W, tfh, tr));
  cut.push(dustFlapUp(xL, yPT, L, sfh, dt));
  cut.push(`M ${xE} ${yPT} L ${xE} ${yPB}`);

  // Bottom = auto-lock: angled interlocking flaps (parallelogram lock tabs)
  const lock = Math.min(W, L) * 0.55;
  const skew = lock * 0.4;
  const mkLock = (x, w, dir) => {
    // dir +1 for panels folding one way
    const yTip = yPB + lock;
    cut.push(`M ${x} ${yPB} L ${x + dir * skew} ${yTip} L ${x + w - dir * skew} ${yTip} L ${x + w} ${yPB}`);
  };
  mkLock(xF, W, 1);
  mkLock(xR, L, -1);
  mkLock(xB, W, 1);
  mkLock(xL, L, -1);

  crease.push(`M ${xF} ${yPT} L ${xF} ${yPB}`, `M ${xR} ${yPT} L ${xR} ${yPB}`, `M ${xB} ${yPT} L ${xB} ${yPB}`, `M ${xL} ${yPT} L ${xL} ${yPB}`);
  crease.push(`M ${xF} ${yPT} L ${xE} ${yPT}`, `M ${xF} ${yPB} L ${xE} ${yPB}`);
  // diagonal auto-lock creases
  crease.push(`M ${xF} ${yPB} L ${xF + W / 2} ${yPB + lock * 0.5}`, `M ${xB} ${yPB} L ${xB + W / 2} ${yPB + lock * 0.5}`);

  const ann = [
    { text: 'Front', x: xF + W / 2, y: yPT + H / 2 }, { text: 'Right', x: xR + L / 2, y: yPT + H / 2 },
    { text: 'Back', x: xB + W / 2, y: yPT + H / 2 }, { text: 'Left', x: xL + L / 2, y: yPT + H / 2 },
    { text: 'Auto-Lock', x: xF + W / 2, y: yPB + lock * 0.6, dim: false },
    { text: W + '', x: xF + W / 2, y: yPT + H + 12, dim: 'w' }, { text: L + '', x: xR + L / 2, y: yPT + H + 12, dim: 'l' },
    { text: H + '', x: xF - 12, y: yPT + H / 2, dim: 'h', rotate: true },
  ];
  return { cut, crease, width: xE, height: yPB + lock, annotations: ann };
}

// ---------------------------------------------------------------------------
// 5. TRAY / display base
// ---------------------------------------------------------------------------
export function generateTray(L, W, H, T) {
  const G = 20, gt = 8, fh = H + T * 2;
  const xF = G, xR = G + W, xB = G + W + L, xL = G + 2 * W + L, xE = G + 2 * W + 2 * L;
  const yPT = fh, yBot = fh + H;
  const cut = [], crease = [];

  cut.push(`M 0 ${yPT - gt} L ${G} ${yPT} L ${G} ${yBot} L 0 ${yBot + gt} Z`);
  cut.push(`M ${xF} ${yPT} L ${xF} 0 L ${xF + W} 0 L ${xF + W} ${yPT}`);
  cut.push(`M ${xR} ${yPT} L ${xR} ${T} L ${xR + L} ${T} L ${xR + L} ${yPT}`);
  cut.push(`M ${xB} ${yPT} L ${xB} 0 L ${xB + W} 0 L ${xB + W} ${yPT}`);
  cut.push(`M ${xL} ${yPT} L ${xL} ${T} L ${xL + L} ${T} L ${xL + L} ${yPT}`);
  cut.push(`M ${xE} ${yPT} L ${xE} ${yBot}`);

  const dfh = W / 2 + T;
  cut.push(`M ${xF} ${yBot} L ${xF + 8} ${yBot + dfh} L ${xF + W - 8} ${yBot + dfh} L ${xF + W} ${yBot}`);
  cut.push(`M ${xR} ${yBot} L ${xR + 8} ${yBot + dfh} L ${xR + L - 8} ${yBot + dfh} L ${xR + L} ${yBot}`);
  cut.push(`M ${xB} ${yBot} L ${xB + 8} ${yBot + dfh} L ${xB + W - 8} ${yBot + dfh} L ${xB + W} ${yBot}`);
  cut.push(`M ${xL} ${yBot} L ${xL + 8} ${yBot + dfh} L ${xL + L - 8} ${yBot + dfh} L ${xL + L} ${yBot}`);

  crease.push(`M ${xF} ${yPT} L ${xF} ${yBot}`, `M ${xR} ${yPT} L ${xR} ${yBot}`, `M ${xB} ${yPT} L ${xB} ${yBot}`, `M ${xL} ${yPT} L ${xL} ${yBot}`);
  crease.push(`M ${xF} ${yPT} L ${xE} ${yPT}`, `M ${xF} ${yBot} L ${xE} ${yBot}`);

  const ann = [
    { text: 'Front', x: xF + W / 2, y: yPT + H / 2 }, { text: 'Right', x: xR + L / 2, y: yPT + H / 2 },
    { text: 'Back', x: xB + W / 2, y: yPT + H / 2 }, { text: 'Left', x: xL + L / 2, y: yPT + H / 2 },
    { text: W + '', x: xF + W / 2, y: yBot + 12, dim: 'w' }, { text: L + '', x: xR + L / 2, y: yBot + 12, dim: 'l' },
  ];
  return { cut, crease, width: xE, height: yBot + dfh, annotations: ann };
}

// ---------------------------------------------------------------------------
// 6. TWO-PIECE (base + lid)  — two nets stacked
// ---------------------------------------------------------------------------
export function generateTwoPiece(L, W, H, T) {
  const G = 20, gap = 30;
  const cut = [], crease = [], ann = [];
  const drawTray = (offY, boxH, label) => {
    const fh = boxH + T * 2;
    const xF = G, xR = G + W, xB = G + W + L, xL = G + 2 * W + L, xE = G + 2 * W + 2 * L;
    const yPT = offY + fh, yBot = offY + fh + boxH;
    cut.push(`M ${xF} ${yPT} L ${xF} ${offY} L ${xF + W} ${offY} L ${xF + W} ${yPT}`);
    cut.push(`M ${xR} ${yPT} L ${xR} ${offY + T} L ${xR + L} ${offY + T} L ${xR + L} ${yPT}`);
    cut.push(`M ${xB} ${yPT} L ${xB} ${offY} L ${xB + W} ${offY} L ${xB + W} ${yPT}`);
    cut.push(`M ${xL} ${yPT} L ${xL} ${offY + T} L ${xL + L} ${offY + T} L ${xL + L} ${yPT}`);
    cut.push(`M ${xF} ${yPT} L ${xF} ${yBot} L ${xF - 0} ${yBot}`);
    cut.push(`M ${xE} ${yPT} L ${xE} ${yBot}`);
    const dfh = W / 2 + T;
    cut.push(`M ${xF} ${yBot} L ${xF + 8} ${yBot + dfh} L ${xF + W - 8} ${yBot + dfh} L ${xF + W} ${yBot}`);
    cut.push(`M ${xR} ${yBot} L ${xR + 8} ${yBot + dfh} L ${xR + L - 8} ${yBot + dfh} L ${xR + L} ${yBot}`);
    cut.push(`M ${xB} ${yBot} L ${xB + 8} ${yBot + dfh} L ${xB + W - 8} ${yBot + dfh} L ${xB + W} ${yBot}`);
    cut.push(`M ${xL} ${yBot} L ${xL + 8} ${yBot + dfh} L ${xL + L - 8} ${yBot + dfh} L ${xL + L} ${yBot}`);
    cut.push(`M ${xF} ${yPT} L ${xE} ${yPT}`);
    cut.push(`M ${xF} ${yBot} L ${xE} ${yBot}`);
    crease.push(`M ${xF} ${yPT} L ${xF} ${yBot}`, `M ${xR} ${yPT} L ${xR} ${yBot}`, `M ${xB} ${yPT} L ${xB} ${yBot}`, `M ${xL} ${yPT} L ${xL} ${yBot}`);
    crease.push(`M ${xF} ${yPT} L ${xE} ${yPT}`, `M ${xF} ${yBot} L ${xE} ${yBot}`);
    ann.push({ text: label, x: xB + W / 2, y: yPT + boxH / 2 });
    return yBot + dfh;
  };
  const baseBottom = drawTray(0, H, 'BASE');
  const lidBottom = drawTray(baseBottom + gap, Math.max(H * 0.3, 20), 'LID');
  ann.push({ text: W + '', x: G + W / 2, y: baseBottom + 4, dim: 'w' });
  ann.push({ text: L + '', x: G + W + L / 2, y: baseBottom + 4, dim: 'l' });
  const xE = G + 2 * W + 2 * L;
  return { cut, crease, width: xE, height: lidBottom, annotations: ann };
}

// ---------------------------------------------------------------------------
// 7. WINDOW box (straight tuck + display window on front)
// ---------------------------------------------------------------------------
export function generateWindow(L, W, H, T) {
  const base = generateStraightTuck(L, W, H, T);
  const G = 20, tfh = L / 2 + T;
  const xF = G, yPT = tfh, yPB = tfh + H;
  // Window: rounded rectangle inside the front panel, with margins
  const mx = W * 0.16, my = H * 0.16;
  const wx = xF + mx, wy = yPT + my, ww = W - 2 * mx, wh = H - 2 * my, r = Math.min(ww, wh) * 0.12;
  base.cut.push(
    `M ${wx + r} ${wy} L ${wx + ww - r} ${wy} Q ${wx + ww} ${wy} ${wx + ww} ${wy + r} L ${wx + ww} ${wy + wh - r} Q ${wx + ww} ${wy + wh} ${wx + ww - r} ${wy + wh} L ${wx + r} ${wy + wh} Q ${wx} ${wy + wh} ${wx} ${wy + wh - r} L ${wx} ${wy + r} Q ${wx} ${wy} ${wx + r} ${wy} Z`
  );
  base.annotations.push({ text: 'Window', x: xF + W / 2, y: yPT + H / 2 + 4, dim: false });
  return base;
}

// ---------------------------------------------------------------------------
// 8. HEXAGONAL box (6 side panels + hex top/bottom)
// ---------------------------------------------------------------------------
export function generateHexagonal(L, W, H, T) {
  const G = 20, gt = 8;
  const side = Math.max(W, L) / 2;         // length of one hexagon edge
  const panels = 6;
  const glue = side * 0.35;
  const xStart = G;
  const yTop = side * 0.9;                  // room for hex lid above
  const yBot = yTop + H;
  const cut = [], crease = [], ann = [];

  cut.push(`M 0 ${yTop - gt} L ${xStart} ${yTop} L ${xStart} ${yBot} L 0 ${yBot + gt} Z`);
  // 6 side panels
  for (let i = 0; i < panels; i++) {
    const x = xStart + i * side;
    crease.push(`M ${x} ${yTop} L ${x} ${yBot}`);
    // top tuck flap (alternate)
    const fd = side * 0.5;
    if (i % 2 === 0) cut.push(dustFlapUp(x, yTop, side, fd, side * 0.18));
    else cut.push(`M ${x} ${yTop} L ${x} ${yTop - fd * 0.5} L ${x + side} ${yTop - fd * 0.5} L ${x + side} ${yTop}`);
    // bottom closing flap
    if (i % 2 === 0) cut.push(dustFlapDown(x, yBot, side, fd, side * 0.18));
    else cut.push(`M ${x} ${yBot} L ${x} ${yBot + fd * 0.5} L ${x + side} ${yBot + fd * 0.5} L ${x + side} ${yBot}`);
  }
  const xEnd = xStart + panels * side;
  // glue tab
  cut.push(`M ${xEnd} ${yTop} L ${xEnd + glue} ${yTop + H * 0.12} L ${xEnd + glue} ${yBot - H * 0.12} L ${xEnd} ${yBot}`);
  crease.push(`M ${xEnd} ${yTop} L ${xEnd} ${yBot}`);
  crease.push(`M ${xStart} ${yTop} L ${xEnd} ${yTop}`, `M ${xStart} ${yBot} L ${xEnd} ${yBot}`);

  ann.push({ text: 'Hexagonal · 6 panels', x: xStart + (panels * side) / 2, y: yTop + H / 2, dim: false });
  ann.push({ text: side.toFixed(0) + '', x: xStart + side / 2, y: yBot + 12, dim: 'w' });
  ann.push({ text: H + '', x: xStart - 12, y: yTop + H / 2, dim: 'h', rotate: true });
  return { cut, crease, width: xEnd + glue, height: yBot + side * 0.5, annotations: ann };
}

// ---------------------------------------------------------------------------
// 9. PILLOW box (curved-end closure)
// ---------------------------------------------------------------------------
export function generatePillow(L, W, H, T) {
  const G = 20, gt = 8;
  // panels: top(W) side(H) bottom(W) side(H) + glue
  const p1 = W, p2 = H, p3 = W, p4 = H, glue = H * 0.5;
  const xF = G, xR = G + p1, xB = G + p1 + p2, xL = G + p1 + p2 + p3, xE = G + p1 + p2 + p3 + p4;
  const yTop = 0, yBot = L;                  // L is the box length
  const curve = L * 0.28;
  const cut = [], crease = [], ann = [];

  cut.push(`M 0 ${yTop - gt} L ${xF} ${yTop}`);
  // top curved closure across the whole width
  cut.push(`M ${xF} ${yTop} Q ${(xF + xE) / 2} ${yTop - curve} ${xE} ${yTop}`);
  // bottom curved closure
  cut.push(`M ${xF} ${yBot} Q ${(xF + xE) / 2} ${yBot + curve} ${xE} ${yBot}`);
  cut.push(`M ${xF} ${yTop} L ${xF} ${yBot}`);
  cut.push(`M ${xE} ${yTop} L ${xE} ${yBot}`);
  // glue tab
  cut.push(`M ${xE} ${yTop} L ${xE + glue} ${yTop + curve * 0.6} L ${xE + glue} ${yBot - curve * 0.6} L ${xE} ${yBot}`);

  crease.push(`M ${xR} ${yTop} L ${xR} ${yBot}`, `M ${xB} ${yTop} L ${xB} ${yBot}`, `M ${xL} ${yTop} L ${xL} ${yBot}`);
  // curved crease guides near ends
  crease.push(`M ${xF} ${yTop + curve * 0.5} Q ${(xF + xE) / 2} ${yTop + curve * 0.5 - curve * 0.5} ${xE} ${yTop + curve * 0.5}`);
  crease.push(`M ${xF} ${yBot - curve * 0.5} Q ${(xF + xE) / 2} ${yBot - curve * 0.5 + curve * 0.5} ${xE} ${yBot - curve * 0.5}`);

  ann.push({ text: 'Pillow', x: xB, y: L / 2, dim: false });
  ann.push({ text: W + '', x: xF + p1 / 2, y: yBot + 14, dim: 'w' });
  ann.push({ text: L + '', x: xF - 14, y: yBot / 2, dim: 'l', rotate: true });
  return { cut, crease, width: xE + glue, height: yBot + curve, annotations: ann };
}

// ---------------------------------------------------------------------------
// 10. SLEEVE (open tube)
// ---------------------------------------------------------------------------
export function generateSleeve(L, W, H, T) {
  const G = 20, gt = 8, ov = T * 2;
  const p1 = W + ov, p2 = L + ov, p3 = W + ov, p4 = L + ov;
  const xF = G, xR = G + p1, xB = G + p1 + p2, xL = G + p1 + p2 + p3, xE = G + p1 + p2 + p3 + p4;
  const yP = 0, yB = H;
  const cut = [], crease = [];

  cut.push(`M 0 ${yP - gt} L ${G} ${yP} L ${G} ${yB} L 0 ${yB + gt} Z`);
  cut.push(`M ${xE} ${yP} L ${xE} ${yB}`);
  cut.push(`M ${xF} ${yP} L ${xE} ${yP}`);
  cut.push(`M ${xF} ${yB} L ${xE} ${yB}`);

  crease.push(`M ${xF} ${yP} L ${xF} ${yB}`, `M ${xR} ${yP} L ${xR} ${yB}`, `M ${xB} ${yP} L ${xB} ${yB}`, `M ${xL} ${yP} L ${xL} ${yB}`);

  const ann = [
    { text: 'Front', x: xF + p1 / 2, y: yP + H / 2 }, { text: 'Right', x: xR + p2 / 2, y: yP + H / 2 },
    { text: 'Back', x: xB + p3 / 2, y: yP + H / 2 }, { text: 'Left', x: xL + p4 / 2, y: yP + H / 2 },
    { text: p1.toFixed(0) + '', x: xF + p1 / 2, y: yB + 14, dim: 'w' },
    { text: p2.toFixed(0) + '', x: xR + p2 / 2, y: yB + 14, dim: 'l' },
    { text: H + '', x: xF - 14, y: yP + H / 2, dim: 'h', rotate: true },
  ];
  return { cut, crease, width: xE, height: yB, annotations: ann };
}

// ---------------------------------------------------------------------------
// 11. GABLE (carry-handle top)
// ---------------------------------------------------------------------------
export function generateGable(L, W, H, T) {
  const G = 20, gt = 8, dt = Math.min(12, W / 15);
  const roofH = Math.sqrt((L / 2) * (L / 2) + (H * 0.6) * (H * 0.6));
  const sfh = W / 2;
  const xF = G, xR = G + W, xB = G + W + L, xL = G + 2 * W + L, xE = G + 2 * W + 2 * L;
  const yPT = roofH, yPB = roofH + H, yBot = roofH + H + L / 2;
  const ySR = roofH - sfh;
  const cut = [], crease = [];

  cut.push(`M 0 ${yPT - gt} L ${G} ${yPT} L ${G} ${yPB} L 0 ${yPB + gt} Z`);
  cut.push(`M ${xF} ${yPT} L ${xF + W / 2} 0 L ${xF + W} ${yPT}`);
  cut.push(`M ${xR} ${yPT} L ${xR + dt} ${ySR} L ${xR + L - dt} ${ySR} L ${xR + L} ${yPT}`);
  cut.push(`M ${xB} ${yPT} L ${xB + W / 2} 0 L ${xB + W} ${yPT}`);
  cut.push(`M ${xL} ${yPT} L ${xL + dt} ${ySR} L ${xL + L - dt} ${ySR} L ${xL + L} ${yPT}`);
  cut.push(`M ${xE} ${yPT} L ${xE} ${yPB}`);

  const hx = xF + W / 2, hy = roofH * 0.35, hw = Math.min(20, W / 5), hh = Math.min(15, roofH / 5);
  cut.push(`M ${hx - hw} ${hy - hh} Q ${hx - hw} ${hy} ${hx} ${hy} Q ${hx + hw} ${hy} ${hx + hw} ${hy - hh}`);

  cut.push(`M ${xF} ${yPB} L ${xF + 8} ${yBot} L ${xF + W - 8} ${yBot} L ${xF + W} ${yPB}`);
  cut.push(`M ${xR} ${yPB} L ${xR + 8} ${yBot} L ${xR + L - 8} ${yBot} L ${xR + L} ${yPB}`);
  cut.push(`M ${xB} ${yPB} L ${xB + 8} ${yBot} L ${xB + W - 8} ${yBot} L ${xB + W} ${yPB}`);
  cut.push(`M ${xL} ${yPB} L ${xL + 8} ${yBot} L ${xL + L - 8} ${yBot} L ${xL + L} ${yPB}`);

  crease.push(`M ${xF} ${yPT} L ${xF} ${yPB}`, `M ${xR} ${yPT} L ${xR} ${yPB}`, `M ${xB} ${yPT} L ${xB} ${yPB}`, `M ${xL} ${yPT} L ${xL} ${yPB}`);
  crease.push(`M ${xF} ${yPT} L ${xE} ${yPT}`, `M ${xF} ${yPB} L ${xE} ${yPB}`);

  const ann = [
    { text: 'Front', x: xF + W / 2, y: yPT + H / 2 }, { text: 'Right', x: xR + L / 2, y: yPT + H / 2 },
    { text: 'Back', x: xB + W / 2, y: yPT + H / 2 }, { text: 'Left', x: xL + L / 2, y: yPT + H / 2 },
    { text: W + '', x: xF + W / 2, y: yPB + 12, dim: 'w' }, { text: L + '', x: xR + L / 2, y: yPB + 12, dim: 'l' },
  ];
  return { cut, crease, width: xE, height: yBot, annotations: ann };
}

// ---------------------------------------------------------------------------
// 12. HANGER box (tuck end + euro-slot hanger tab)
// ---------------------------------------------------------------------------
export function generateHanger(L, W, H, T) {
  const base = generateStraightTuck(L, W, H, T);
  const G = 20, tfh = L / 2 + T;
  const xF = G, yPT = tfh;
  // Hanger tab above the front top tuck flap
  const tabH = Math.min(28, H * 0.25);
  const tabY = yPT - tfh - tabH;
  const tx = xF + W * 0.2, tw = W * 0.6;
  base.cut.push(`M ${tx} ${yPT - tfh} L ${tx} ${tabY} L ${tx + tw} ${tabY} L ${tx + tw} ${yPT - tfh}`);
  // euro slot (keyhole)
  const kx = xF + W / 2, ky = tabY + tabH * 0.5, kr = tabH * 0.28;
  base.cut.push(`M ${kx - kr} ${ky} A ${kr} ${kr} 0 1 0 ${kx + kr} ${ky} L ${kx + kr * 0.4} ${ky + kr * 1.6} L ${kx - kr * 0.4} ${ky + kr * 1.6} Z`);
  base.crease.push(`M ${tx} ${yPT - tfh} L ${tx + tw} ${yPT - tfh}`);
  base.annotations.push({ text: 'Hanger', x: kx, y: tabY - 4, dim: false });
  return base;
}

// ============================================================================
//  Box-type registry (for the "Models" selector)
// ============================================================================
export const BOX_TYPES = [
  { cat: 'Cartons', items: [
    { id: 'straight-tuck', name: 'Straight Tuck End', category: 'tuckend', icon: 'fa-box', impl: true },
    { id: 'reverse-tuck', name: 'Reverse Tuck End', category: 'tuckend', icon: 'fa-exchange-alt', impl: true },
    { id: 'auto-lock', name: 'Auto-Lock Bottom', category: 'autolock', icon: 'fa-lock', impl: true },
    { id: 'window', name: 'Window Box', category: 'window', icon: 'fa-window-maximize', impl: true },
    { id: 'hanger', name: 'Hanger Box', category: 'hanger', icon: 'fa-thumbtack', impl: true },
  ]},
  { cat: 'Mailers & Trays', items: [
    { id: 'mailer', name: 'Mailer Box', category: 'mailer', icon: 'fa-box-open', impl: true },
    { id: 'tray', name: 'Tray / Display', category: 'tray', icon: 'fa-inbox', impl: true },
    { id: 'two-piece', name: 'Two-Piece Box', category: 'twopiece', icon: 'fa-boxes', impl: true },
  ]},
  { cat: 'Specialty', items: [
    { id: 'gable', name: 'Gable Box', category: 'gable', icon: 'fa-home', impl: true },
    { id: 'sleeve', name: 'Sleeve', category: 'sleeve', icon: 'fa-grip-lines', impl: true },
    { id: 'hexagonal', name: 'Hexagonal Box', category: 'hexagonal', icon: 'fa-draw-polygon', impl: true },
    { id: 'pillow', name: 'Pillow Box', category: 'pillow', icon: 'fa-cloud', impl: true },
  ]},
];

// Generator lookup by box-type id
export const GENERATORS = {
  'mailer': generateMailer,
  'straight-tuck': generateStraightTuck,
  'reverse-tuck': generateReverseTuck,
  'auto-lock': generateAutoLock,
  'tray': generateTray,
  'two-piece': generateTwoPiece,
  'window': generateWindow,
  'hexagonal': generateHexagonal,
  'pillow': generatePillow,
  'sleeve': generateSleeve,
  'gable': generateGable,
  'hanger': generateHanger,
};

// Map a pacdora data category -> default box-type id
export const CATEGORY_TO_TYPE = {
  tuckend: 'straight-tuck',
  mailer: 'mailer',
  gable: 'gable',
  tray: 'tray',
  sleeve: 'sleeve',
  autolock: 'auto-lock',
  twopiece: 'two-piece',
  window: 'window',
  hexagonal: 'hexagonal',
  pillow: 'pillow',
  hanger: 'hanger',
};

// ============================================================================
//  Per-card parameter derivation
//  The pacdora dataset has no explicit dimensions, so we derive a STABLE
//  (deterministic) set of L/W/H/T + a refined box-type for every card, seeded
//  by its id + name. Same card => same design every time; different cards =>
//  different proportions (and often a different sub-type).
// ============================================================================

// Small deterministic string hash (FNV-1a style) -> unsigned 32-bit
function hashStr(str) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}
// Seeded pseudo-random generator (mulberry32)
function seeded(seed) {
  let a = seed >>> 0;
  return () => {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Refine the box-type from keywords in the card name (falls back to category).
export function refineType(dieline) {
  const n = (dieline?.name || '').toLowerCase();
  const has = (...ks) => ks.some((k) => n.includes(k));
  if (has('reverse tuck')) return 'reverse-tuck';
  if (has('straight tuck')) return 'straight-tuck';
  if (has('window', 'clear pvc', 'display window')) return 'window';
  if (has('hang', 'hook', 'euro slot', 'euro-slot')) return 'hanger';
  if (has('auto lock', 'auto-lock', 'snap lock', 'snap-lock', 'crash lock', 'auto bottom', 'auto bottome', '1-2-3 bottom')) return 'auto-lock';
  if (has('gable', 'handle', 'carry')) return 'gable';
  if (has('pillow')) return 'pillow';
  if (has('hexagon', 'polygon', 'polygonal', 'octagon')) return 'hexagonal';
  if (has('sleeve', 'envelope')) return 'sleeve';
  if (has('two piece', 'two-piece', 'lid and base', 'base and lid', 'telescope', 'shoulder box', 'rigid')) return 'two-piece';
  if (has('tray', 'display', 'pos ', 'stand')) return 'tray';
  if (has('rsc', 'regular slotted', 'fefco 0201', 'shipping', 'carton', 'mailer')) return dieline?.category === 'mailer' ? 'mailer' : 'tray';
  return CATEGORY_TO_TYPE[dieline?.category] || 'straight-tuck';
}

// Base nominal proportions (L=depth, W=width, H=height) per box-type.
const TYPE_BASE = {
  'mailer':        { L: 250, W: 190, H: 80 },
  'straight-tuck': { L: 90,  W: 60,  H: 150 },
  'reverse-tuck':  { L: 85,  W: 65,  H: 145 },
  'auto-lock':     { L: 100, W: 70,  H: 160 },
  'window':        { L: 90,  W: 70,  H: 150 },
  'hanger':        { L: 70,  W: 55,  H: 150 },
  'tray':          { L: 220, W: 160, H: 60 },
  'two-piece':     { L: 200, W: 150, H: 90 },
  'gable':         { L: 120, W: 120, H: 170 },
  'sleeve':        { L: 150, W: 100, H: 70 },
  'hexagonal':     { L: 110, W: 110, H: 120 },
  'pillow':        { L: 140, W: 90,  H: 35 },
};
// Thickness range by type (corrugated vs folding carton).
const TYPE_T = {
  'mailer': [1.5, 3.0], 'tray': [1.5, 3.0], 'two-piece': [1.2, 2.5],
  'straight-tuck': [0.4, 0.7], 'reverse-tuck': [0.4, 0.7], 'auto-lock': [0.5, 0.8],
  'window': [0.4, 0.7], 'hanger': [0.4, 0.7], 'gable': [0.5, 0.9],
  'sleeve': [0.4, 0.7], 'hexagonal': [0.5, 0.9], 'pillow': [0.4, 0.6],
};

// Try to read explicit "L x W x H" numbers from the name, if present.
function parseDimsFromName(name) {
  const m = (name || '').match(/(\d{1,4})\s*[x×*]\s*(\d{1,4})\s*[x×*]\s*(\d{1,4})/i);
  if (!m) return null;
  const a = +m[1], b = +m[2], c = +m[3];
  if ([a, b, c].some((v) => v < 10 || v > 2000)) return null;
  return { L: a, W: b, H: c };
}

// Derive a stable design (type + dimensions) for a given card.
export function deriveDefaults(dieline) {
  const type = refineType(dieline);
  const base = TYPE_BASE[type] || TYPE_BASE['straight-tuck'];
  const rnd = seeded(hashStr(`${dieline?.id || 0}:${dieline?.name || ''}`));

  // Explicit dims in the name win; otherwise jitter the base by a seeded factor.
  const explicit = parseDimsFromName(dieline?.name);
  const jit = () => 0.72 + rnd() * 0.66; // 0.72 .. 1.38
  let L = explicit ? explicit.L : Math.round(base.L * jit());
  let W = explicit ? explicit.W : Math.round(base.W * jit());
  let H = explicit ? explicit.H : Math.round(base.H * jit());

  // Clamp to editor slider ranges.
  L = Math.max(50, Math.min(500, L));
  W = Math.max(30, Math.min(400, W));
  H = Math.max(20, Math.min(400, H));

  const tr = TYPE_T[type] || [0.4, 0.7];
  const T = +(tr[0] + rnd() * (tr[1] - tr[0])).toFixed(1);

  return { type, L, W, H, T };
}

// The 3D shape family a given box-type id should render as
export const TYPE_TO_SHAPE = {
  'mailer': 'closed',
  'straight-tuck': 'closed',
  'reverse-tuck': 'closed',
  'auto-lock': 'closed',
  'window': 'window',
  'hanger': 'closed',
  'tray': 'tray',
  'two-piece': 'twopiece',
  'gable': 'gable',
  'sleeve': 'sleeve',
  'hexagonal': 'hexagonal',
  'pillow': 'pillow',
};
