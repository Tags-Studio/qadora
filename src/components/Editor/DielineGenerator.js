// ─── توليد ملف SVG لخطوط القطع والطي (Dielines) ─────────────────────

/**
 * ينشئ ملف SVG يحتوي على القالب المسطح لصندوق Tuck-Top
 * @param {string} color - لون العبوة بصيغة HEX
 * @returns {string} - كود SVG كنص
 */
export function generateBoxDielineSVG(color = '#ff6b35') {
  // أبعاد الصندوق (بالبكسل)
  const w = 200; // العرض
  const h = 260; // الارتفاع
  const d = 90;  // العمق

  const padding = 60;
  const totalW = 2 * w + 2 * d + 2 * padding;
  const totalH = h + 2 * d + 2 * padding;
  const ox = padding; // offset X
  const oy = padding; // offset Y

  // ألوان الخطوط
  const cutColor = '#e63946';      // خط قطع (cut line)
  const foldColor = '#2d2823';     // خط طي (fold line)
  const regColor = '#15110d';      // علامات تسجيل

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg
  width="${totalW}"
  height="${totalH}"
  viewBox="0 0 ${totalW} ${totalH}"
  xmlns="http://www.w3.org/2000/svg"
  style="background:#faf8f5; font-family: sans-serif;"
>
  <!-- ====== خلفية القالب ====== -->
  <!-- الواجهة الأمامية -->
  <rect x="${ox + d}" y="${oy + d}" width="${w}" height="${h}" fill="${color}" fill-opacity="0.25"/>
  <!-- الخلف -->
  <rect x="${ox + d + w + d}" y="${oy + d}" width="${w}" height="${h}" fill="${color}" fill-opacity="0.15"/>
  <!-- الجانب الأيسر -->
  <rect x="${ox}" y="${oy + d}" width="${d}" height="${h}" fill="${color}" fill-opacity="0.15"/>
  <!-- الجانب الأيمن -->
  <rect x="${ox + d + w}" y="${oy + d}" width="${d}" height="${h}" fill="${color}" fill-opacity="0.15"/>
  <!-- لسان الغلق العلوي (أمامي) -->
  <rect x="${ox + d}" y="${oy}" width="${w}" height="${d}" fill="${color}" fill-opacity="0.10"/>
  <!-- لسان الغلق السفلي (أمامي) -->
  <rect x="${ox + d}" y="${oy + d + h}" width="${w}" height="${d}" fill="${color}" fill-opacity="0.10"/>

  <!-- ====== خطوط القطع (Solid / الأحمر) ====== -->
  <!-- الحدود الخارجية الكاملة -->
  <path
    d="M${ox},${oy + d}
       L${ox + 2*d + 2*w},${oy + d}
       L${ox + 2*d + 2*w},${oy + d + h}
       L${ox},${oy + d + h} Z"
    fill="none" stroke="${cutColor}" stroke-width="2"
  />
  <!-- لسان علوي -->
  <path
    d="M${ox + d},${oy + d} L${ox + d},${oy} L${ox + d + w},${oy} L${ox + d + w},${oy + d}"
    fill="none" stroke="${cutColor}" stroke-width="2"
  />
  <!-- لسان سفلي -->
  <path
    d="M${ox + d},${oy + d + h} L${ox + d},${oy + 2*d + h} L${ox + d + w},${oy + 2*d + h} L${ox + d + w},${oy + d + h}"
    fill="none" stroke="${cutColor}" stroke-width="2"
  />

  <!-- ====== خطوط الطي (Dashed / الغامق) ====== -->
  <!-- طي عمودي 1 -->
  <line x1="${ox + d}" y1="${oy}" x2="${ox + d}" y2="${oy + 2*d + h}"
    stroke="${foldColor}" stroke-width="1.2" stroke-dasharray="6,4"/>
  <!-- طي عمودي 2 -->
  <line x1="${ox + d + w}" y1="${oy}" x2="${ox + d + w}" y2="${oy + 2*d + h}"
    stroke="${foldColor}" stroke-width="1.2" stroke-dasharray="6,4"/>
  <!-- طي عمودي 3 -->
  <line x1="${ox + 2*d + w}" y1="${oy + d}" x2="${ox + 2*d + w}" y2="${oy + d + h}"
    stroke="${foldColor}" stroke-width="1.2" stroke-dasharray="6,4"/>
  <!-- طي أفقي علوي -->
  <line x1="${ox}" y1="${oy + d}" x2="${ox + 2*d + 2*w}" y2="${oy + d}"
    stroke="${foldColor}" stroke-width="1.2" stroke-dasharray="6,4"/>
  <!-- طي أفقي سفلي -->
  <line x1="${ox}" y1="${oy + d + h}" x2="${ox + 2*d + 2*w}" y2="${oy + d + h}"
    stroke="${foldColor}" stroke-width="1.2" stroke-dasharray="6,4"/>

  <!-- ====== تسميات الأوجه ====== -->
  <text x="${ox + d + w/2}" y="${oy + d + h/2}" text-anchor="middle" dominant-baseline="middle"
    fill="#333" font-size="14" font-weight="bold">الواجهة الأمامية</text>
  <text x="${ox + d + w + d + w/2}" y="${oy + d + h/2}" text-anchor="middle" dominant-baseline="middle"
    fill="#333" font-size="14">الخلفية</text>
  <text x="${ox + d/2}" y="${oy + d + h/2}" text-anchor="middle" dominant-baseline="middle"
    fill="#333" font-size="10">جانب</text>
  <text x="${ox + d + w + d/2}" y="${oy + d + h/2}" text-anchor="middle" dominant-baseline="middle"
    fill="#333" font-size="10">جانب</text>
  <text x="${ox + d + w/2}" y="${oy + d/2}" text-anchor="middle" dominant-baseline="middle"
    fill="#333" font-size="11">لسان علوي</text>
  <text x="${ox + d + w/2}" y="${oy + d + h + d/2}" text-anchor="middle" dominant-baseline="middle"
    fill="#333" font-size="11">لسان سفلي</text>

  <!-- ====== علامات التسجيل (Registration Marks) ====== -->
  <g stroke="${regColor}" stroke-width="1" fill="none">
    <!-- زاوية عليا يسرى -->
    <circle cx="${ox - 20}" cy="${oy - 20}" r="5"/>
    <line x1="${ox - 25}" y1="${oy - 20}" x2="${ox - 15}" y2="${oy - 20}"/>
    <line x1="${ox - 20}" y1="${oy - 25}" x2="${ox - 20}" y2="${oy - 15}"/>
    <!-- زاوية عليا يمنى -->
    <circle cx="${ox + 2*d + 2*w + 20}" cy="${oy - 20}" r="5"/>
    <line x1="${ox + 2*d + 2*w + 15}" y1="${oy - 20}" x2="${ox + 2*d + 2*w + 25}" y2="${oy - 20}"/>
    <line x1="${ox + 2*d + 2*w + 20}" y1="${oy - 25}" x2="${ox + 2*d + 2*w + 20}" y2="${oy - 15}"/>
    <!-- زاوية سفلى يسرى -->
    <circle cx="${ox - 20}" cy="${oy + 2*d + h + 20}" r="5"/>
    <line x1="${ox - 25}" y1="${oy + 2*d + h + 20}" x2="${ox - 15}" y2="${oy + 2*d + h + 20}"/>
    <line x1="${ox - 20}" y1="${oy + 2*d + h + 15}" x2="${ox - 20}" y2="${oy + 2*d + h + 25}"/>
    <!-- زاوية سفلى يمنى -->
    <circle cx="${ox + 2*d + 2*w + 20}" cy="${oy + 2*d + h + 20}" r="5"/>
    <line x1="${ox + 2*d + 2*w + 15}" y1="${oy + 2*d + h + 20}" x2="${ox + 2*d + 2*w + 25}" y2="${oy + 2*d + h + 20}"/>
    <line x1="${ox + 2*d + 2*w + 20}" y1="${oy + 2*d + h + 15}" x2="${ox + 2*d + 2*w + 20}" y2="${oy + 2*d + h + 25}"/>
  </g>

  <!-- ====== مفتاح الألوان ====== -->
  <g transform="translate(${ox}, ${oy + 2*d + h + 35})">
    <rect x="0" y="0" width="14" height="14" fill="${cutColor}"/>
    <text x="18" y="11" fill="#555" font-size="11">خط قطع (Cut Line)</text>
    <line x1="130" y1="7" x2="160" y2="7" stroke="${foldColor}" stroke-width="1.5" stroke-dasharray="5,3"/>
    <text x="165" y="11" fill="#555" font-size="11">خط طي (Fold Line)</text>
  </g>

  <!-- ====== اسم المشروع ====== -->
  <text x="${totalW - 15}" y="${totalH - 10}" text-anchor="end"
    fill="#aaa" font-size="10">Packwave • Dieline Template</text>
</svg>`;
}

/**
 * ينشئ ويحمّل ملف SVG للديلاين مباشرة
 */
export function downloadDieline(color) {
  const svgString = generateBoxDielineSVG(color);
  const blob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
  const url = URL.createObjectURL(blob);

  const link = document.createElement('a');
  link.href = url;
  link.download = 'packwave-dielines.svg';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
