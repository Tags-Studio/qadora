// ==================== Box Categories ====================
export const BOX_TYPES = [
  { cat: 'Mailer Boxes', items: [
    { id:'mailer', name:'Standard Mailer Box', impl:true, icon:'fa-box' },
    { id:'mailer-heavy', name:'Heavy Duty Mailer', impl:false, icon:'fa-box-open' },
    { id:'mailer-diecut', name:'Die-Cut Mailer', impl:false, icon:'fa-cut' },
  ]},
  { cat: 'Tuck-End Boxes', items: [
    { id:'straight-tuck', name:'Straight Tuck-End', impl:true, icon:'fa-arrow-right' },
    { id:'reverse-tuck', name:'Reverse Tuck-End', impl:true, icon:'fa-exchange-alt' },
    { id:'full-overlap', name:'Full Overlap Tuck', impl:false, icon:'fa-layer-group' },
    { id:'snap-lock', name:'Snap-Lock Bottom', impl:false, icon:'fa-lock' },
  ]},
  { cat: 'Trays & Bases', items: [
    { id:'tray', name:'Tray with Flaps', impl:true, icon:'fa-inbox' },
    { id:'tray-diecut', name:'Die-Cut Tray', impl:false, icon:'fa-th-large' },
    { id:'auto-bottom', name:'Auto-Bottom Tray', impl:false, icon:'fa-border-all' },
  ]},
  { cat: 'Sleeves & Wraps', items: [
    { id:'sleeve', name:'Standard Sleeve', impl:true, icon:'fa-grip-lines' },
    { id:'full-sleeve', name:'Full Overlap Sleeve', impl:false, icon:'fa-align-justify' },
  ]},
  { cat: 'Specialty Boxes', items: [
    { id:'gable', name:'Gable Box', impl:true, icon:'fa-home' },
    { id:'pillow', name:'Pillow Box', impl:false, icon:'fa-cloud' },
    { id:'hexagonal', name:'Hexagonal Box', impl:false, icon:'fa-hexagon-xmark' },
    { id:'pyramid', name:'Pyramid Box', impl:false, icon:'fa-mountain' },
    { id:'cone', name:'Cone / Cylinder', impl:false, icon:'fa-circle' },
    { id:'octagonal', name:'Octagonal Box', impl:false, icon:'fa-stop' },
    { id:'window-box', name:'Window Box', impl:false, icon:'fa-window-maximize' },
    { id:'handle-box', name:'Handle Box', impl:false, icon:'fa-hand-paper' },
  ]},
  { cat: 'Rigid Boxes', items: [
    { id:'rigid-two', name:'Two-Piece Rigid', impl:false, icon:'fa-archive' },
    { id:'rigid-hinge', name:'Hinged Lid Rigid', impl:false, icon:'fa-door-open' },
    { id:'rigid-magnetic', name:'Magnetic Closure', impl:false, icon:'fa-magnet' },
  ]},
  { cat: 'Bags & Pouches', items: [
    { id:'stand-pouch', name:'Stand-Up Pouch', impl:false, icon:'fa-shopping-bag' },
    { id:'flat-pouch', name:'Flat Pouch', impl:false, icon:'fa-envelope' },
    { id:'zip-bag', name:'Zip-Lock Bag', impl:false, icon:'fa-lock-open' },
  ]},
  { cat: 'Displays & Stands', items: [
    { id:'display-shelf', name:'Display Shelf', impl:false, icon:'fa-store' },
    { id:'counter-display', name:'Counter Display', impl:false, icon:'fa-desktop' },
    { id:'pallet-box', name:'Pallet Box', impl:false, icon:'fa-pallet' },
  ]},
];

export function generateMailer(L, W, H, T) {
  const G = 20, gt = 8, dt = Math.min(12, W/15), tr = Math.min(10, L/20);
  const tfh = L/2, sfh = W/2, bfh = L/2;
  const atw = Math.min(25, W/5), ath = Math.min(20, bfh/3);
  const atOff = (W - 2*atw) / 3;

  const xF=G, xR=G+W, xB=G+W+L, xL=G+2*W+L, xE=G+2*W+2*L;
  const yPT=tfh, yPB=tfh+H, yBot=tfh+H+bfh;
  const yST=tfh-sfh, ySB=tfh+H+sfh;

  const cut=[], crease=[];

  cut.push(`M 0 ${yPT-gt} L ${G} ${yPT} L ${G} ${yPB} L 0 ${yPB+gt} Z`);
  cut.push(`M ${xF} ${yPT} L ${xF} ${tr} Q ${xF} 0 ${xF+tr} 0 L ${xF+W-tr} 0 Q ${xF+W} 0 ${xF+W} ${tr} L ${xF+W} ${yPT}`);
  cut.push(`M ${xR} ${yPT} L ${xR+dt} ${yST} L ${xR+L-dt} ${yST} L ${xR+L} ${yPT}`);
  cut.push(`M ${xB} ${yPT} L ${xB} ${tr} Q ${xB} 0 ${xB+tr} 0 L ${xB+W-tr} 0 Q ${xB+W} 0 ${xB+W} ${tr} L ${xB+W} ${yPT}`);
  cut.push(`M ${xL} ${yPT} L ${xL+dt} ${yST} L ${xL+L-dt} ${yST} L ${xL+L} ${yPT}`);
  cut.push(`M ${xE} ${yPT} L ${xE} ${yPB}`);

  const t1a=xF+atOff, t1b=t1a+atw, t2a=xF+2*atOff+atw, t2b=t2a+atw;
  const bfy=yBot-ath;
  cut.push(`M ${xF} ${yPB} L ${xF} ${bfy} L ${t1a} ${bfy} L ${t1a+3} ${yBot} L ${t1b-3} ${yBot} L ${t1b} ${bfy} L ${t2a} ${bfy} L ${t2a+3} ${yBot} L ${t2b-3} ${yBot} L ${t2b} ${bfy} L ${xF+W} ${bfy} L ${xF+W} ${yPB}`);
  cut.push(`M ${xR} ${yPB} L ${xR+dt} ${ySB} L ${xR+L-dt} ${ySB} L ${xR+L} ${yPB}`);

  const s1a=xB+atOff+1, s1b=s1a+atw+2, s2a=xB+2*atOff+atw+1, s2b=s2a+atw+2;
  const slotD=ath+4;
  cut.push(`M ${xB} ${yPB} L ${xB} ${yBot} L ${s1a} ${yBot} L ${s1a} ${yBot-slotD} L ${s1b} ${yBot-slotD} L ${s1b} ${yBot} L ${s2a} ${yBot} L ${s2a} ${yBot-slotD} L ${s2b} ${yBot-slotD} L ${s2b} ${yBot} L ${xB+W} ${yBot} L ${xB+W} ${yPB}`);
  cut.push(`M ${xL} ${yPB} L ${xL+dt} ${ySB} L ${xL+L-dt} ${ySB} L ${xL+L} ${yPB}`);

  crease.push(`M ${xF} ${yPT} L ${xF} ${yPB}`);
  crease.push(`M ${xR} ${yPT} L ${xR} ${yPB}`);
  crease.push(`M ${xB} ${yPT} L ${xB} ${yPB}`);
  crease.push(`M ${xL} ${yPT} L ${xL} ${yPB}`);
  crease.push(`M ${xF} ${yPT} L ${xE} ${yPT}`);
  crease.push(`M ${xF} ${yPB} L ${xE} ${yPB}`);

  const ann = [
    { text:'Front', x:xF+W/2, y:yPT+H/2 },
    { text:'Right', x:xR+L/2, y:yPT+H/2 },
    { text:'Back', x:xB+W/2, y:yPT+H/2 },
    { text:'Left', x:xL+L/2, y:yPT+H/2 },
    { text:W+'', x:xF+W/2, y:yPT+H+12, dim:'w' },
    { text:L+'', x:xR+L/2, y:yPT+H+12, dim:'l' },
    { text:H+'', x:xF-12, y:yPT+H/2, dim:'h', rotate:true },
  ];
  return { cut, crease, width:xE, height:yBot, annotations:ann };
}

export function generateStraightTuck(L, W, H, T) {
  const G=20, gt=8, dt=Math.min(12,W/15), tr=Math.min(10,L/20);
  const tfh=L/2+T, sfh=W/2+T, bfh=L/2+T;
  const xF=G, xR=G+W, xB=G+W+L, xL=G+2*W+L, xE=G+2*W+2*L;
  const yPT=tfh, yPB=tfh+H, yBot=tfh+H+bfh, yST=tfh-sfh, ySB=tfh+H+sfh;
  const cut=[], crease=[];

  cut.push(`M 0 ${yPT-gt} L ${G} ${yPT} L ${G} ${yPB} L 0 ${yPB+gt} Z`);
  cut.push(`M ${xF} ${yPT} L ${xF} ${tr} Q ${xF} 0 ${xF+tr} 0 L ${xF+W-tr} 0 Q ${xF+W} 0 ${xF+W} ${tr} L ${xF+W} ${yPT}`);
  cut.push(`M ${xR} ${yPT} L ${xR+dt} ${yST} L ${xR+L-dt} ${yST} L ${xR+L} ${yPT}`);
  cut.push(`M ${xB} ${yPT} L ${xB} ${tr} Q ${xB} 0 ${xB+tr} 0 L ${xB+W-tr} 0 Q ${xB+W} 0 ${xB+W} ${tr} L ${xB+W} ${yPT}`);
  cut.push(`M ${xL} ${yPT} L ${xL+dt} ${yST} L ${xL+L-dt} ${yST} L ${xL+L} ${yPT}`);
  cut.push(`M ${xE} ${yPT} L ${xE} ${yPB}`);

  cut.push(`M ${xF} ${yPB} L ${xF} ${yBot-tr} Q ${xF} ${yBot} ${xF+tr} ${yBot} L ${xF+W-tr} ${yBot} Q ${xF+W} ${yBot} ${xF+W} ${yBot-tr} L ${xF+W} ${yPB}`);
  cut.push(`M ${xR} ${yPB} L ${xR+dt} ${ySB} L ${xR+L-dt} ${ySB} L ${xR+L} ${yPB}`);
  cut.push(`M ${xB} ${yPB} L ${xB} ${yBot-tr} Q ${xB} ${yBot} ${xB+tr} ${yBot} L ${xB+W-tr} ${yBot} Q ${xB+W} ${yBot} ${xB+W} ${yBot-tr} L ${xB+W} ${yPB}`);
  cut.push(`M ${xL} ${yPB} L ${xL+dt} ${ySB} L ${xL+L-dt} ${ySB} L ${xL+L} ${yPB}`);

  crease.push(`M ${xF} ${yPT} L ${xF} ${yPB}`, `M ${xR} ${yPT} L ${xR} ${yPB}`, `M ${xB} ${yPT} L ${xB} ${yPB}`, `M ${xL} ${yPT} L ${xL} ${yPB}`);
  crease.push(`M ${xF} ${yPT} L ${xE} ${yPT}`, `M ${xF} ${yPB} L ${xE} ${yPB}`);

  const ann=[
    {text:'Front',x:xF+W/2,y:yPT+H/2},{text:'Right',x:xR+L/2,y:yPT+H/2},
    {text:'Back',x:xB+W/2,y:yPT+H/2},{text:'Left',x:xL+L/2,y:yPT+H/2},
    {text:W+'',x:xF+W/2,y:yPT+H+12,dim:'w'},{text:L+'',x:xR+L/2,y:yPT+H+12,dim:'l'},
    {text:H+'',x:xF-12,y:yPT+H/2,dim:'h',rotate:true},
  ];
  return {cut,crease,width:xE,height:yBot,annotations:ann};
}

export function generateReverseTuck(L, W, H, T) {
  const G=20, gt=8, dt=Math.min(12,W/15), tr=Math.min(10,L/20);
  const tfh=L/2+T, sfh=W/2+T, bfh=L/2+T;
  const xF=G, xR=G+W, xB=G+W+L, xL=G+2*W+L, xE=G+2*W+2*L;
  const yPT=tfh, yPB=tfh+H, yBot=tfh+H+bfh, yST=tfh-sfh, ySB=tfh+H+sfh;
  const cut=[], crease=[];

  cut.push(`M 0 ${yPT-gt} L ${G} ${yPT} L ${G} ${yPB} L 0 ${yPB+gt} Z`);
  cut.push(`M ${xF} ${yPT} L ${xF} ${tr} Q ${xF} 0 ${xF+tr} 0 L ${xF+W-tr} 0 Q ${xF+W} 0 ${xF+W} ${tr} L ${xF+W} ${yPT}`);
  cut.push(`M ${xR} ${yPT} L ${xR+dt} ${yST} L ${xR+L-dt} ${yST} L ${xR+L} ${yPT}`);
  const revH = Math.min(bfh, L/3);
  cut.push(`M ${xB} ${yPT} L ${xB} ${yPT+revH-tr} Q ${xB} ${yPT+revH} ${xB+tr} ${yPT+revH} L ${xB+W-tr} ${yPT+revH} Q ${xB+W} ${yPT+revH} ${xB+W} ${yPT+revH-tr} L ${xB+W} ${yPT}`);
  cut.push(`M ${xL} ${yPT} L ${xL+dt} ${yST} L ${xL+L-dt} ${yST} L ${xL+L} ${yPT}`);
  cut.push(`M ${xE} ${yPT} L ${xE} ${yPB}`);

  cut.push(`M ${xF} ${yPB} L ${xF} ${yPB-bfh+tr} Q ${xF} ${yPB-bfh} ${xF+tr} ${yPB-bfh} L ${xF+W-tr} ${yPB-bfh} Q ${xF+W} ${yPB-bfh} ${xF+W} ${yPB-bfh+tr} L ${xF+W} ${yPB}`);
  cut.push(`M ${xR} ${yPB} L ${xR+dt} ${ySB} L ${xR+L-dt} ${ySB} L ${xR+L} ${yPB}`);
  cut.push(`M ${xB} ${yPB} L ${xB} ${yBot-tr} Q ${xB} ${yBot} ${xB+tr} ${yBot} L ${xB+W-tr} ${yBot} Q ${xB+W} ${yBot} ${xB+W} ${yBot-tr} L ${xB+W} ${yPB}`);
  cut.push(`M ${xL} ${yPB} L ${xL+dt} ${ySB} L ${xL+L-dt} ${ySB} L ${xL+L} ${yPB}`);

  crease.push(`M ${xF} ${yPT} L ${xF} ${yPB}`, `M ${xR} ${yPT} L ${xR} ${yPB}`, `M ${xB} ${yPT} L ${xB} ${yPB}`, `M ${xL} ${yPT} L ${xL} ${yPB}`);
  crease.push(`M ${xF} ${yPT} L ${xE} ${yPT}`, `M ${xF} ${yPB} L ${xE} ${yPB}`);

  const ann=[
    {text:'Front',x:xF+W/2,y:yPT+H/2},{text:'Right',x:xR+L/2,y:yPT+H/2},
    {text:'Back',x:xB+W/2,y:yPT+H/2},{text:'Left',x:xL+L/2,y:yPT+H/2},
    {text:W+'',x:xF+W/2,y:yPT+H+12,dim:'w'},{text:L+'',x:xR+L/2,y:yPT+H+12,dim:'l'},
    {text:H+'',x:xF-12,y:yPT+H/2,dim:'h',rotate:true},
  ];
  return {cut,crease,width:xE,height:yBot,annotations:ann};
}

export function generateTray(L, W, H, T) {
  const G=20, gt=8, fh=H+T*2;
  const xF=G, xR=G+W, xB=G+W+L, xL=G+2*W+L, xE=G+2*W+2*L;
  const yPT=fh, yBot=fh+H;
  const cut=[], crease=[];

  cut.push(`M 0 ${yPT-gt} L ${G} ${yPT} L ${G} ${yBot} L 0 ${yBot+gt} Z`);
  cut.push(`M ${xF} ${yPT} L ${xF} 0 L ${xF+W} 0 L ${xF+W} ${yPT}`);
  cut.push(`M ${xR} ${yPT} L ${xR} ${T} L ${xR+L} ${T} L ${xR+L} ${yPT}`);
  cut.push(`M ${xB} ${yPT} L ${xB} 0 L ${xB+W} 0 L ${xB+W} ${yPT}`);
  cut.push(`M ${xL} ${yPT} L ${xL} ${T} L ${xL+L} ${T} L ${xL+L} ${yPT}`);
  cut.push(`M ${xE} ${yPT} L ${xE} ${yBot}`);

  const dfh = W/2 + T;
  cut.push(`M ${xF} ${yBot} L ${xF+8} ${yBot+dfh} L ${xF+W-8} ${yBot+dfh} L ${xF+W} ${yBot}`);
  cut.push(`M ${xR} ${yBot} L ${xR+8} ${yBot+dfh} L ${xR+L-8} ${yBot+dfh} L ${xR+L} ${yBot}`);
  cut.push(`M ${xB} ${yBot} L ${xB+8} ${yBot+dfh} L ${xB+W-8} ${yBot+dfh} L ${xB+W} ${yBot}`);
  cut.push(`M ${xL} ${yBot} L ${xL+8} ${yBot+dfh} L ${xL+L-8} ${yBot+dfh} L ${xL+L} ${yBot}`);

  crease.push(`M ${xF} ${yPT} L ${xF} ${yBot}`, `M ${xR} ${yPT} L ${xR} ${yBot}`, `M ${xB} ${yPT} L ${xB} ${yBot}`, `M ${xL} ${yPT} L ${xL} ${yBot}`);
  crease.push(`M ${xF} ${yPT} L ${xE} ${yPT}`, `M ${xF} ${yBot} L ${xE} ${yBot}`);

  const ann=[
    {text:'Front',x:xF+W/2,y:yPT+H/2},{text:'Right',x:xR+L/2,y:yPT+H/2},
    {text:'Back',x:xB+W/2,y:yPT+H/2},{text:'Left',x:xL+L/2,y:yPT+H/2},
    {text:W+'',x:xF+W/2,y:yBot+12,dim:'w'},{text:L+'',x:xR+L/2,y:yBot+12,dim:'l'},
  ];
  return {cut,crease,width:xE,height:yBot+dfh,annotations:ann};
}

export function generateSleeve(L, W, H, T) {
  const G=20, gt=8, ov=T*2;
  const p1=W+ov, p2=L+ov, p3=W+ov, p4=L+ov;
  const xF=G, xR=G+p1, xB=G+p1+p2, xL=G+p1+p2+p3, xE=G+p1+p2+p3+p4;
  const yP=0, yB=H;
  const cut=[], crease=[];

  cut.push(`M 0 ${yP-gt} L ${G} ${yP} L ${G} ${yB} L 0 ${yB+gt} Z`);
  cut.push(`M ${xE} ${yP} L ${xE} ${yB}`);
  cut.push(`M ${xF} ${yP} L ${xE} ${yP}`);
  cut.push(`M ${xF} ${yB} L ${xE} ${yB}`);

  crease.push(`M ${xF} ${yP} L ${xF} ${yB}`, `M ${xR} ${yP} L ${xR} ${yB}`, `M ${xB} ${yP} L ${xB} ${yB}`, `M ${xL} ${yP} L ${xL} ${yB}`);

  const ann=[
    {text:'Front',x:xF+p1/2,y:yP+H/2},{text:'Right',x:xR+p2/2,y:yP+H/2},
    {text:'Back',x:xB+p3/2,y:yP+H/2},{text:'Left',x:xL+p4/2,y:yP+H/2},
    {text:p1+'',x:xF+p1/2,y:yB+14,dim:'w'},
    {text:p2+'',x:xR+p2/2,y:yB+14,dim:'l'},
    {text:H+'',x:xF-14,y:yP+H/2,dim:'h',rotate:true},
  ];
  return {cut,crease,width:xE,height:yB,annotations:ann};
}

export function generateGable(L, W, H, T) {
  const G=20, gt=8, dt=Math.min(12,W/15);
  const roofH = Math.sqrt((L/2)*(L/2) + (H*0.6)*(H*0.6));
  const sfh = W/2;
  const xF=G, xR=G+W, xB=G+W+L, xL=G+2*W+L, xE=G+2*W+2*L;
  const yPT=roofH, yPB=roofH+H, yBot=roofH+H+L/2;
  const ySR=roofH-sfh;

  const cut=[], crease=[];

  cut.push(`M 0 ${yPT-gt} L ${G} ${yPT} L ${G} ${yPB} L 0 ${yPB+gt} Z`);

  cut.push(`M ${xF} ${yPT} L ${xF+W/2} 0 L ${xF+W} ${yPT}`);
  cut.push(`M ${xR} ${yPT} L ${xR+dt} ${ySR} L ${xR+L-dt} ${ySR} L ${xR+L} ${yPT}`);
  cut.push(`M ${xB} ${yPT} L ${xB+W/2} 0 L ${xB+W} ${yPT}`);
  cut.push(`M ${xL} ${yPT} L ${xL+dt} ${ySR} L ${xL+L-dt} ${ySR} L ${xL+L} ${yPT}`);
  cut.push(`M ${xE} ${yPT} L ${xE} ${yPB}`);

  const hx=xF+W/2, hy=roofH*0.35, hw=Math.min(20,W/5), hh=Math.min(15,roofH/5);
  cut.push(`M ${hx-hw} ${hy-hh} Q ${hx-hw} ${hy} ${hx} ${hy} Q ${hx+hw} ${hy} ${hx+hw} ${hy-hh}`);

  const bfh=L/2;
  cut.push(`M ${xF} ${yPB} L ${xF+8} ${yBot} L ${xF+W-8} ${yBot} L ${xF+W} ${yPB}`);
  cut.push(`M ${xR} ${yPB} L ${xR+8} ${yBot} L ${xR+L-8} ${yBot} L ${xR+L} ${yPB}`);
  cut.push(`M ${xB} ${yPB} L ${xB+8} ${yBot} L ${xB+W-8} ${yBot} L ${xB+W} ${yPB}`);
  cut.push(`M ${xL} ${yPB} L ${xL+8} ${yBot} L ${xL+L-8} ${yBot} L ${xL+L} ${yPB}`);

  crease.push(`M ${xF} ${yPT} L ${xF} ${yPB}`, `M ${xR} ${yPT} L ${xR} ${yPB}`, `M ${xB} ${yPT} L ${xB} ${yPB}`, `M ${xL} ${yPT} L ${xL} ${yPB}`);
  crease.push(`M ${xF} ${yPT} L ${xE} ${yPT}`, `M ${xF} ${yPB} L ${xE} ${yPB}`);

  const ann=[
    {text:'Front',x:xF+W/2,y:yPT+H/2},{text:'Right',x:xR+L/2,y:yPT+H/2},
    {text:'Back',x:xB+W/2,y:yPT+H/2},{text:'Left',x:xL+L/2,y:yPT+H/2},
    {text:W+'',x:xF+W/2,y:yPB+12,dim:'w'},{text:L+'',x:xR+L/2,y:yPB+12,dim:'l'},
  ];
  return {cut,crease,width:xE,height:yBot,annotations:ann};
}

export const GENERATORS = {
  'mailer': generateMailer,
  'straight-tuck': generateStraightTuck,
  'reverse-tuck': generateReverseTuck,
  'tray': generateTray,
  'sleeve': generateSleeve,
  'gable': generateGable,
};
