import React, { useState, useMemo } from 'react';
import './DielinePage.css';

// Helper component to render a beautiful micro vector schematic of the dieline based on its type
// Supports two modes:
// - "detailed": cut lines in blue (#2563eb), fold lines in red (#ef4444)
// - "simple": outer boundary in solid grey (#6b7280), internal folds in dashed grey
function MiniDielineSVG({ dielineName, mode = 'detailed' }) {
  const name = dielineName.toLowerCase();
  
  const cutColor = mode === 'detailed' ? '#3b82f6' : '#6b7280';
  const foldColor = mode === 'detailed' ? '#ef4444' : '#9ca3af';
  const foldDash = mode === 'detailed' ? 'none' : '2,2';

  // 1. PAPER BAG
  if (name.includes('bag')) {
    return (
      <svg className="mini-dieline-vector" viewBox="0 0 100 100" fill="none" strokeWidth="0.8">
        {/* Main panels */}
        <rect x="15" y="15" width="22" height="50" rx="0.5" stroke={cutColor} />
        <rect x="37" y="15" width="12" height="50" rx="0.5" stroke={cutColor} />
        <rect x="49" y="15" width="22" height="50" rx="0.5" stroke={cutColor} />
        <rect x="71" y="15" width="12" height="50" rx="0.5" stroke={cutColor} />
        {/* Glue tab */}
        <path d="M 83 20 L 87 23 L 87 57 L 83 60 Z" stroke={cutColor} />
        {/* Bottom flaps */}
        <rect x="15" y="65" width="22" height="12" stroke={foldColor} strokeDasharray={foldDash} />
        <rect x="37" y="65" width="12" height="12" stroke={foldColor} strokeDasharray={foldDash} />
        <rect x="49" y="65" width="22" height="12" stroke={foldColor} strokeDasharray={foldDash} />
        <rect x="71" y="65" width="12" height="12" stroke={foldColor} strokeDasharray={foldDash} />
        {/* Vertical fold separator lines */}
        <line x1="37" y1="15" x2="37" y2="77" stroke={foldColor} strokeDasharray={foldDash} />
        <line x1="49" y1="15" x2="49" y2="77" stroke={foldColor} strokeDasharray={foldDash} />
        <line x1="71" y1="15" x2="71" y2="77" stroke={foldColor} strokeDasharray={foldDash} />
      </svg>
    );
  }

  // 2. SLOTTED SHIPPING BOX (RSC / FEFCO 0201)
  if (name.includes('rsc') || name.includes('slotted') || name.includes('fefco 0201') || name.includes('fefco 0300')) {
    return (
      <svg className="mini-dieline-vector" viewBox="0 0 100 100" fill="none" strokeWidth="0.8">
        {/* Main body panels */}
        <rect x="10" y="30" width="24" height="40" stroke={cutColor} />
        <rect x="34" y="30" width="14" height="40" stroke={cutColor} />
        <rect x="48" y="30" width="24" height="40" stroke={cutColor} />
        <rect x="72" y="30" width="14" height="40" stroke={cutColor} />
        {/* Top & Bottom flaps */}
        <rect x="10" y="15" width="24" height="15" stroke={cutColor} />
        <rect x="34" y="20" width="14" height="10" stroke={cutColor} />
        <rect x="48" y="15" width="24" height="15" stroke={cutColor} />
        <rect x="72" y="20" width="14" height="10" stroke={cutColor} />
        <rect x="10" y="70" width="24" height="15" stroke={cutColor} />
        <rect x="34" y="70" width="14" height="10" stroke={cutColor} />
        <rect x="48" y="70" width="24" height="15" stroke={cutColor} />
        <rect x="72" y="70" width="14" height="10" stroke={cutColor} />
        {/* Horizontal fold lines */}
        <line x1="10" y1="30" x2="86" y2="30" stroke={foldColor} strokeDasharray={foldDash} />
        <line x1="10" y1="70" x2="86" y2="70" stroke={foldColor} strokeDasharray={foldDash} />
        {/* Vertical fold lines */}
        <line x1="34" y1="15" x2="34" y2="80" stroke={foldColor} strokeDasharray={foldDash} />
        <line x1="48" y1="15" x2="48" y2="80" stroke={foldColor} strokeDasharray={foldDash} />
        <line x1="72" y1="15" x2="72" y2="80" stroke={foldColor} strokeDasharray={foldDash} />
      </svg>
    );
  }

  // 3. DRAWER BOX
  if (name.includes('drawer') || name.includes('slide')) {
    return (
      <svg className="mini-dieline-vector" viewBox="0 0 100 100" fill="none" strokeWidth="0.8">
        {/* Outer Sleeve (left) */}
        <rect x="8" y="20" width="16" height="45" stroke={cutColor} />
        <rect x="24" y="20" width="8" height="45" stroke={cutColor} />
        <rect x="32" y="20" width="16" height="45" stroke={cutColor} />
        <rect x="48" y="20" width="8" height="45" stroke={cutColor} />
        <line x1="24" y1="20" x2="24" y2="65" stroke={foldColor} strokeDasharray={foldDash} />
        <line x1="32" y1="20" x2="32" y2="65" stroke={foldColor} strokeDasharray={foldDash} />
        <line x1="48" y1="20" x2="48" y2="65" stroke={foldColor} strokeDasharray={foldDash} />

        {/* Inner Tray (right) */}
        <rect x="64" y="28" width="22" height="28" stroke={cutColor} />
        <rect x="64" y="18" width="22" height="10" stroke={cutColor} />
        <rect x="64" y="56" width="22" height="10" stroke={cutColor} />
        <line x1="64" y1="28" x2="86" y2="28" stroke={foldColor} strokeDasharray={foldDash} />
        <line x1="64" y1="56" x2="86" y2="56" stroke={foldColor} strokeDasharray={foldDash} />
      </svg>
    );
  }

  // 4. MAILER BOX (FEFCO 0427 / Hinged lid)
  if (name.includes('mailer') || name.includes('hinged') || name.includes('fefco 0427') || name.includes('fefco 0426') || name.includes('tray')) {
    return (
      <svg className="mini-dieline-vector" viewBox="0 0 100 100" fill="none" strokeWidth="0.8">
        {/* Main base */}
        <rect x="32" y="32" width="36" height="26" stroke={cutColor} />
        {/* Hinged lid */}
        <rect x="32" y="14" width="36" height="18" stroke={cutColor} />
        {/* Side wings */}
        <path d="M 12 32 L 32 32 L 32 58 L 12 58 Z" stroke={cutColor} />
        <path d="M 68 32 L 88 32 L 88 58 L 68 58 Z" stroke={cutColor} />
        {/* Flaps */}
        <path d="M 32 58 L 68 58 L 63 76 L 37 76 Z" stroke={cutColor} />
        {/* Internal fold lines */}
        <line x1="32" y1="32" x2="68" y2="32" stroke={foldColor} strokeDasharray={foldDash} />
        <line x1="32" y1="58" x2="68" y2="58" stroke={foldColor} strokeDasharray={foldDash} />
        <line x1="32" y1="14" x2="32" y2="76" stroke={foldColor} strokeDasharray={foldDash} />
        <line x1="68" y1="14" x2="68" y2="76" stroke={foldColor} strokeDasharray={foldDash} />
      </svg>
    );
  }

  // 5. TUCK END BOX (Default folding carton)
  return (
    <svg className="mini-dieline-vector" viewBox="0 0 100 100" fill="none" strokeWidth="0.8">
      {/* 4 main walls */}
      <rect x="15" y="25" width="16" height="50" stroke={cutColor} />
      <rect x="31" y="25" width="16" height="50" stroke={cutColor} />
      <rect x="47" y="25" width="16" height="50" stroke={cutColor} />
      <rect x="63" y="25" width="16" height="50" stroke={cutColor} />
      {/* Glue Flap */}
      <rect x="79" y="30" width="6" height="40" stroke={cutColor} />
      {/* Top Tuck Lid */}
      <rect x="15" y="12" width="16" height="13" stroke={cutColor} />
      <path d="M 15 12 L 20 5 L 26 5 L 31 12" stroke={cutColor} />
      {/* Bottom Tuck Lid */}
      <rect x="47" y="75" width="16" height="13" stroke={cutColor} />
      <path d="M 47 88 L 52 95 L 58 95 L 63 88" stroke={cutColor} />
      {/* Internal folds */}
      <line x1="15" y1="25" x2="79" y2="25" stroke={foldColor} strokeDasharray={foldDash} />
      <line x1="15" y1="75" x2="79" y2="75" stroke={foldColor} strokeDasharray={foldDash} />
      <line x1="31" y1="25" x2="31" y2="75" stroke={foldColor} strokeDasharray={foldDash} />
      <line x1="47" y1="25" x2="47" y2="75" stroke={foldColor} strokeDasharray={foldDash} />
      <line x1="63" y1="25" x2="63" y2="75" stroke={foldColor} strokeDasharray={foldDash} />
      <line x1="79" y1="30" x2="79" y2="70" stroke={foldColor} strokeDasharray={foldDash} />
    </svg>
  );
}

const DIELINE_CATEGORIES = [
  { id: 'all', name: 'All Dielines', count: 20 },
  { id: 'fefco', name: 'FEFCO', count: 6 },
  { id: 'tuckend', name: 'Tuck End Box', count: 5 },
  { id: 'folding', name: 'Folding Carton', count: 4 },
  { id: 'tray', name: 'Tray & Box', count: 2 },
  { id: 'rigid', name: 'Rigid Box', count: 2 },
  { id: 'bags', name: 'Paper Bag', count: 1 }
];

const REAL_DIELINE_DATA = [
  {
    id: 1,
    name: "Rollover hinged lid mailer box dieline",
    category: "fefco",
    formats: ["AI", "PDF", "DXF"],
    image: "https://cdn.pacdora.com/model/4fa4385f-fd84-4ed7-ae49-221ae0b7c695.png"
  },
  {
    id: 2,
    name: "Reverse tuck end box dieline",
    category: "tuckend",
    formats: ["AI", "PDF", "SVG"],
    image: "https://cdn.pacdora.com/model/1d34c6ad-4569-42b7-a37a-42c26f0f5b9d.png"
  },
  {
    id: 3,
    name: "Tuck end mailer box packaging dieline",
    category: "fefco",
    formats: ["AI", "PDF", "DXF", "SVG"],
    image: "https://cdn.pacdora.com/model/2c0d8320-ebdb-47b8-bc71-120008bd12cc.png"
  },
  {
    id: 4,
    name: "FEFCO 0217 carrying handle top",
    category: "fefco",
    formats: ["AI", "PDF", "SVG"],
    image: "https://cdn.pacdora.com/admin-materials/e09e3a6c-ceb0-410a-9d9f-6820253457a1.png"
  },
  {
    id: 5,
    name: "Medicine box dieline",
    category: "folding",
    formats: ["AI", "PDF", "DXF"],
    image: "https://cdn.pacdora.com/model/bd1c1b79-be4b-4518-8d2b-49a25ed9fd79.png"
  },
  {
    id: 6,
    name: "Sweet box dieline",
    category: "folding",
    formats: ["AI", "PDF", "SVG"],
    image: "https://cdn.pacdora.com/model/8b8e0b65-e9df-416b-9c2b-1a0e026b9a89.png"
  },
  {
    id: 7,
    name: "FEFCO 0201 regular slotted box (RSC) dieline",
    category: "fefco",
    formats: ["AI", "PDF", "DXF", "SVG"],
    image: "https://cdn.pacdora.com/admin-materials/c3c5f189-a097-4d47-aa89-06280795a325.png"
  },
  {
    id: 8,
    name: "FEFCO 0426 tray with front self locking walls and hinged lid dieline",
    category: "fefco",
    formats: ["AI", "PDF", "SVG"],
    image: "https://cdn.pacdora.com/model/db1853f6-49f9-467f-8561-8aa22f7fb5c6.png"
  },
  {
    id: 9,
    name: "Cosmetic box dieline",
    category: "tuckend",
    formats: ["AI", "PDF", "DXF"],
    image: "https://cdn.pacdora.com/model/b4b39794-caee-4ea0-bd89-e265c71b12cc.png"
  },
  {
    id: 10,
    name: "Square cosmetics jar box dieline",
    category: "tuckend",
    formats: ["AI", "PDF", "SVG"],
    image: "https://cdn.pacdora.com/model/65ef122a-f96b-4e08-bfb1-ea21051515ef.png"
  },
  {
    id: 11,
    name: "FEFCO 0300 full telescope side slotted box (FTSSC) dieline",
    category: "fefco",
    formats: ["AI", "PDF", "DXF"],
    image: "https://cdn.pacdora.com/admin-materials/be03848b-3e5f-4632-a5be-449e7b23cf49.png"
  },
  {
    id: 12,
    name: "Flip top magnetic gift box dieline",
    category: "rigid",
    formats: ["AI", "PDF", "SVG"],
    image: "https://cdn.pacdora.com/admin-materials/2d927845-fe88-4ff2-ac7b-8bfd545d02fe.png"
  },
  {
    id: 13,
    name: "Drawer gift box dieline",
    category: "rigid",
    formats: ["AI", "PDF", "DXF", "SVG"],
    image: "https://cdn.pacdora.com/model/f28eb2cc-1f8e-4a6c-94cc-ae4c0628bd89.png"
  },
  {
    id: 14,
    name: "Auto lock bottom box dieline",
    category: "tuckend",
    formats: ["AI", "PDF", "SVG"],
    image: "https://cdn.pacdora.com/model/e3b6a22f-d890-48e0-bb49-5f280a7bfb21.png"
  },
  {
    id: 15,
    name: "FEFCO 0427 roll end tray with locking cover dieline",
    category: "tray",
    formats: ["AI", "PDF", "DXF"],
    image: "https://cdn.pacdora.com/model/319ef4f8-ad23-455b-9d4b-ac89a2b53cdc.png"
  },
  {
    id: 16,
    name: "Paper shopping bag dieline",
    category: "bags",
    formats: ["AI", "PDF", "SVG"],
    image: "https://cdn.pacdora.com/preview/dieline-220010.png"
  },
  {
    id: 17,
    name: "Tuck end card game box dieline",
    category: "tuckend",
    formats: ["AI", "PDF", "DXF"],
    image: "https://cdn.pacdora.com/model/7cde8eef-a44e-4f05-88f1-eab1e26b1580.png"
  },
  {
    id: 18,
    name: "Food drawer box dieline",
    category: "tray",
    formats: ["AI", "PDF", "SVG"],
    image: "https://cdn.pacdora.com/model/a4b29efc-ff67-46e3-aa00-fe58b9fdfbe0.png"
  },
  {
    id: 19,
    name: "Cake box with handle dieline",
    category: "folding",
    formats: ["AI", "PDF", "DXF", "SVG"],
    image: "https://cdn.pacdora.com/admin-materials/20ce9a0f-15cb-42a9-a9a7-96bcaec0bc8b.png"
  },
  {
    id: 20,
    name: "Face Cream Open tuck end box dieline",
    category: "folding",
    formats: ["AI", "PDF", "SVG"],
    image: "https://cdn.pacdora.com/model/1484c3fc-7efe-409c-980d-084c5caa0191.png"
  }
];

export default function DielinePage({ onBack, onSelectDieline }) {
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const allDielines = useMemo(() => REAL_DIELINE_DATA, []);

  const filteredDielines = useMemo(() => {
    const list = [...allDielines];
    
    // Generative template search fallback
    if (searchTerm.trim().length > 2) {
      const match = list.some(dieline => dieline.name.toLowerCase().includes(searchTerm.toLowerCase()));
      if (!match) {
        const term = searchTerm.trim();
        const firstWord = term.split(' ')[0].toLowerCase();
        
        let determinedCategory = 'folding';
        let imageUrl = 'https://cdn.pacdora.com/model/bd1c1b79-be4b-4518-8d2b-49a25ed9fd79.png'; // default medicine
        
        if (firstWord.includes('bag') || term.includes('bag')) {
          determinedCategory = 'bags';
          imageUrl = 'https://cdn.pacdora.com/preview/dieline-220010.png';
        } else if (firstWord.includes('mailer') || term.includes('pizza') || term.includes('shoe') || term.includes('flat')) {
          determinedCategory = 'mailer';
          imageUrl = 'https://cdn.pacdora.com/model/4fa4385f-fd84-4ed7-ae49-221ae0b7c695.png';
        } else if (firstWord.includes('shipping') || term.includes('carton') || term.includes('fefco')) {
          determinedCategory = 'fefco';
          imageUrl = 'https://cdn.pacdora.com/admin-materials/c3c5f189-a097-4d47-aa89-06280795a325.png';
        } else if (firstWord.includes('drawer') || term.includes('gift') || term.includes('rigid') || term.includes('magnetic')) {
          determinedCategory = 'rigid';
          imageUrl = 'https://cdn.pacdora.com/admin-materials/2d927845-fe88-4ff2-ac7b-8bfd545d02fe.png';
        }

        list.push({
          id: 9999,
          name: `${term.charAt(0).toUpperCase() + term.slice(1)} Dieline Template`,
          category: determinedCategory,
          formats: ["AI", "PDF", "DXF", "SVG"],
          image: imageUrl
        });
      }
    }

    return list.filter(dieline => {
      const matchCategory = selectedCategory === 'all' || dieline.category === selectedCategory;
      const matchSearch = dieline.name.toLowerCase().includes(searchTerm.toLowerCase());
      return matchCategory && matchSearch;
    });
  }, [selectedCategory, searchTerm, allDielines]);

  return (
    <div className="dieline-page">
      {/* Header */}
      <div className="dieline-header">
        <div className="dieline-header-content">
          <h1 className="dieline-title">
            <span className="arrow-icon">➜</span>
            3,000+ Free printable & customizable box templates
          </h1>
          <p className="dieline-description">
            Designing attractive, effective boxes for your product is essential to sell well. 
            Our library of customizable box templates can assist you in creating your box templates.
          </p>
          <div className="dieline-search">
            <input
              type="text"
              placeholder="Try 4+ words to describe..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="dieline-search-input"
            />
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="dieline-container">
        {/* Sidebar with Categories */}
        <aside className="dieline-sidebar">
          <div className="dieline-filters">
            <h3 className="filter-title">By Models</h3>
            <div className="filter-categories">
              {DIELINE_CATEGORIES.map((category) => (
                <button
                  key={category.id}
                  className={`category-button ${selectedCategory === category.id ? 'active' : ''}`}
                  onClick={() => setSelectedCategory(category.id)}
                >
                  <span className="category-name"># {category.name}</span>
                  <span className="category-count">{category.count}</span>
                </button>
              ))}
            </div>
          </div>
        </aside>

        {/* Main Content Area */}
        <main className="dieline-main">
          <div className="dieline-results-header">
            <h2 className="results-title">
              {selectedCategory === 'all'
                ? 'All Dielines'
                : `${DIELINE_CATEGORIES.find(c => c.id === selectedCategory)?.name}`}
            </h2>
            <p className="results-count">{filteredDielines.length} Templates</p>
          </div>

          {/* Grid of Dielines */}
          <div className="dieline-grid">
            {filteredDielines.map((dieline) => (
              <div
                key={dieline.id}
                className="dieline-card"
                onClick={() => onSelectDieline?.(dieline)}
                style={{ cursor: 'pointer' }}
              >
                {/* Split Thumbnail: Left side shows detailed Dieline (blue/red), Right side shows simple structural schematic */}
                <div className="dieline-card-image split-thumbnail">
                  <div className="thumbnail-2d-side detailed-vector-bg">
                    <MiniDielineSVG dielineName={dieline.name} mode="detailed" />
                  </div>
                  <div className="thumbnail-2d-side simple-vector-bg">
                    <MiniDielineSVG dielineName={dieline.name} mode="simple" />
                  </div>
                  <div className="dieline-card-overlay">
                    <button className="dieline-action-btn">View & Edit</button>
                  </div>
                </div>
                <div className="dieline-card-content">
                  <h4 className="dieline-card-title">{dieline.name}</h4>
                  <div className="dieline-formats">
                    {dieline.formats.map((format) => (
                      <span key={format} className="format-badge">{format}</span>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {filteredDielines.length === 0 && (
            <div className="no-results">
              <p>No dielines found matching your search.</p>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
