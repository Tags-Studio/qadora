import { useState, useMemo } from 'react';
import './DielineDetailPage.css';
import { generateBoxDielineSVG } from './Editor/DielineGenerator';

export default function DielineDetailPage({ dieline, onBack }) {
  const [unit, setUnit] = useState('mm'); // 'mm' | 'inch'
  const [dimensions, setDimensions] = useState({
    length: 200,
    width: 200,
    depth: 90,
    thickness: 1.5,
  });

  const [previewMode, setPreviewMode] = useState('2d'); // '2d' | '3d'
  const [paperType, setPaperType] = useState('corrugated'); // 'corrugated' | 'cardboard' | 'kraft'

  const handleDimensionChange = (key, val) => {
    const numVal = parseFloat(val) || 0;
    setDimensions((prev) => ({ ...prev, [key]: numVal }));
  };

  // توليد كود SVG المخصص ديناميكياً بناءً على الأبعاد
  const customSvgCode = useMemo(() => {
    // نقوم بتعديل الحسابات بناءً على أبعاد المستخدم ديناميكياً
    const scale = unit === 'inch' ? 25.4 : 1; // تحويل الإنش لبكسل نسبي
    const w = dimensions.length * (scale / 1);
    const h = dimensions.width * (scale / 1);
    const d = dimensions.depth * (scale / 1);

    const padding = 50;
    const totalW = 2 * w + 2 * d + 2 * padding;
    const totalH = h + 2 * d + 2 * padding;
    const ox = padding;
    const oy = padding;

    const cutColor = '#e63946';
    const foldColor = '#2d2823';

    return `
      <svg width="100%" height="100%" viewBox="0 0 ${totalW} ${totalH}" xmlns="http://www.w3.org/2000/svg">
        <rect x="${ox + d}" y="${oy + d}" width="${w}" height="${h}" fill="#ff6b35" fill-opacity="0.12"/>
        <rect x="${ox + d + w + d}" y="${oy + d}" width="${w}" height="${h}" fill="#ff6b35" fill-opacity="0.08"/>
        <rect x="${ox}" y="${oy + d}" width="${d}" height="${h}" fill="#ff6b35" fill-opacity="0.08"/>
        <rect x="${ox + d + w}" y="${oy + d}" width="${d}" height="${h}" fill="#ff6b35" fill-opacity="0.08"/>
        <rect x="${ox + d}" y="${oy}" width="${w}" height="${d}" fill="#ff6b35" fill-opacity="0.05"/>
        <rect x="${ox + d}" y="${oy + d + h}" width="${w}" height="${d}" fill="#ff6b35" fill-opacity="0.05"/>
        
        <path d="M${ox},${oy + d} L${ox + 2*d + 2*w},${oy + d} L${ox + 2*d + 2*w},${oy + d + h} L${ox},${oy + d + h} Z" fill="none" stroke="${cutColor}" stroke-width="2"/>
        <path d="M${ox + d},${oy + d} L${ox + d},${oy} L${ox + d + w},${oy} L${ox + d + w},${oy + d}" fill="none" stroke="${cutColor}" stroke-width="2"/>
        <path d="M${ox + d},${oy + d + h} L${ox + d},${oy + 2*d + h} L${ox + d + w},${oy + 2*d + h} L${ox + d + w},${oy + d + h}" fill="none" stroke="${cutColor}" stroke-width="2"/>

        <line x1="${ox + d}" y1="${oy}" x2="${ox + d}" y2="${oy + 2*d + h}" stroke="${foldColor}" stroke-width="1.2" stroke-dasharray="6,4"/>
        <line x1="${ox + d + w}" y1="${oy}" x2="${ox + d + w}" y2="${oy + 2*d + h}" stroke="${foldColor}" stroke-width="1.2" stroke-dasharray="6,4"/>
        <line x1="${ox + 2*d + w}" y1="${oy + d}" x2="${ox + 2*d + w}" y2="${oy + d + h}" stroke="${foldColor}" stroke-width="1.2" stroke-dasharray="6,4"/>
        <line x1="${ox}" y1="${oy + d}" x2="${ox + 2*d + 2*w}" y2="${oy + d}" stroke="${foldColor}" stroke-width="1.2" stroke-dasharray="6,4"/>
        <line x1="${ox}" y1="${oy + d + h}" x2="${ox + 2*d + 2*w}" y2="${oy + d + h}" stroke="${foldColor}" stroke-width="1.2" stroke-dasharray="6,4"/>
      </svg>
    `;
  }, [dimensions, unit]);

  const handleDownload = (format) => {
    const svgContent = customSvgCode;
    const blob = new Blob([svgContent], { type: 'image/svg+xml' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${dieline.name.toLowerCase().replace(/\s+/g, '-')}.${format.toLowerCase()}`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="detail-page-container">
      {/* Navbar / Breadcrumbs */}
      <header className="detail-navbar">
        <button className="detail-back-btn" onClick={onBack}>
          <span>←</span> Back to Templates
        </button>
        <div className="detail-breadcrumbs">
          <span>Dielines</span> / <span>{dieline.category.toUpperCase()}</span> / <span className="active">{dieline.name}</span>
        </div>
      </header>

      {/* Main Workspace */}
      <div className="detail-workspace">
        {/* Left Side: interactive Preview area */}
        <main className="detail-preview-panel">
          <div className="preview-mode-switch">
            <button
              className={`mode-btn ${previewMode === '2d' ? 'active' : ''}`}
              onClick={() => setPreviewMode('2d')}
            >
              📐 2D Dieline Template
            </button>
            <button
              className={`mode-btn ${previewMode === '3d' ? 'active' : ''}`}
              onClick={() => setPreviewMode('3d')}
            >
              📦 3D Mockup Preview
            </button>
          </div>

          <div className="preview-canvas-container">
            {previewMode === '2d' ? (
              <div className="svg-dieline-preview" dangerouslySetInnerHTML={{ __html: customSvgCode }} />
            ) : (
              <div className="mockup-dieline-preview">
                <img src={dieline.image} alt={dieline.name} className="dieline-showcase-img" />
                <div className="preview-badge-overlay">3D Static Preview</div>
              </div>
            )}
          </div>
          
          <div className="canvas-footer-tip">
            Drag to pan dieline. All measurements match industrial printing specifications.
          </div>
        </main>

        {/* Right Side: Customization Parameters */}
        <aside className="detail-sidebar-panel">
          <div className="sidebar-header-info">
            <h2 className="dieline-model-title">{dieline.name}</h2>
            <div className="model-badges">
              <span className="badge-model">ID: {dieline.id}</span>
              <span className="badge-model">Format: {dieline.formats.join(', ')}</span>
            </div>
          </div>

          <div className="sidebar-sections-wrapper">
            {/* Unit Selector */}
            <section className="detail-sidebar-section">
              <h3 className="section-title">Units</h3>
              <div className="unit-toggle">
                <button className={`unit-btn ${unit === 'mm' ? 'active' : ''}`} onClick={() => setUnit('mm')}>
                  Millimeter (mm)
                </button>
                <button className={`unit-btn ${unit === 'inch' ? 'active' : ''}`} onClick={() => setUnit('inch')}>
                  Inch (in)
                </button>
              </div>
            </section>

            {/* Custom Dimensions */}
            <section className="detail-sidebar-section">
              <h3 className="section-title">Dimensions</h3>
              <div className="dimension-inputs-group">
                <div className="dim-input-row">
                  <div className="dim-label-col">
                    <span className="dim-name">Length (L)</span>
                    <span className="dim-desc">Front panel width</span>
                  </div>
                  <input
                    type="number"
                    value={dimensions.length}
                    onChange={(e) => handleDimensionChange('length', e.target.value)}
                    className="dim-numeric-input"
                  />
                  <span className="dim-unit">{unit}</span>
                </div>

                <div className="dim-input-row">
                  <div className="dim-label-col">
                    <span className="dim-name">Width (W)</span>
                    <span className="dim-desc">Side panel depth</span>
                  </div>
                  <input
                    type="number"
                    value={dimensions.width}
                    onChange={(e) => handleDimensionChange('width', e.target.value)}
                    className="dim-numeric-input"
                  />
                  <span className="dim-unit">{unit}</span>
                </div>

                <div className="dim-input-row">
                  <div className="dim-label-col">
                    <span className="dim-name">Depth (D)</span>
                    <span className="dim-desc">Total box height</span>
                  </div>
                  <input
                    type="number"
                    value={dimensions.depth}
                    onChange={(e) => handleDimensionChange('depth', e.target.value)}
                    className="dim-numeric-input"
                  />
                  <span className="dim-unit">{unit}</span>
                </div>
              </div>
            </section>

            {/* Material & Thickness */}
            <section className="detail-sidebar-section">
              <h3 className="section-title">Material Specification</h3>
              
              <div className="select-material-group">
                <label className="input-field-label">Paper Type</label>
                <select
                  value={paperType}
                  onChange={(e) => setPaperType(e.target.value)}
                  className="material-select-dropdown"
                >
                  <option value="corrugated">Corrugated Cardboard (E-Flute)</option>
                  <option value="cardboard">White Kraft Paperboard</option>
                  <option value="kraft">Brown Kraft Paper</option>
                </select>
              </div>

              <div className="slider-thickness-group">
                <div className="slider-label-row">
                  <span className="slider-lbl">Thickness / Bleed</span>
                  <span className="slider-num">{dimensions.thickness} mm</span>
                </div>
                <input
                  type="range"
                  min="0.5"
                  max="6"
                  step="0.1"
                  value={dimensions.thickness}
                  onChange={(e) => handleDimensionChange('thickness', e.target.value)}
                  className="material-slider"
                />
              </div>
            </section>
          </div>

          {/* Download & Export CTA Panel */}
          <div className="detail-export-action-box">
            <button className="primary-action-download" onClick={() => handleDownload('SVG')}>
              📥 Download Vector Dieline (SVG)
            </button>
            <div className="secondary-download-grid">
              <button className="sec-action-btn" onClick={() => handleDownload('PDF')}>
                PDF Layout
              </button>
              <button className="sec-action-btn" onClick={() => handleDownload('DXF')}>
                CAD File (DXF)
              </button>
            </div>
            <p className="commercial-disclaimer">
              Licensed under MIT. Ready for instant commercial production.
            </p>
          </div>
        </aside>
      </div>
    </div>
  );
}
