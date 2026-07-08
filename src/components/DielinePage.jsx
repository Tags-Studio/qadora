import { useState, useMemo } from 'react';
import './DielinePage.css';

// Sample dieline data - can be replaced with API call
const DIELINE_CATEGORIES = [
  { id: 'all', name: 'All', count: 20 },
  { id: 'fefco', name: 'FEFCO Boxes', count: 5 },
  { id: 'folding', name: 'Folding Boxes', count: 5 },
  { id: 'tray', name: 'Tray Boxes', count: 2 },
  { id: 'tuckend', name: 'Tuck End Boxes', count: 6 },
  { id: 'rigid', name: 'Rigid Boxes', count: 3 },
  { id: 'bags', name: 'Paper Bags', count: 1 },
];

// Authentic dieline templates from Pacdora
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
    formats: ["AI", "PDF", "DXF"],
    image: "https://cdn.pacdora.com/admin-materials/ee11054f-f163-467a-bb9f-d09dad4d5632.png"
  },
  {
    id: 3,
    name: "Tuck end mailer box packaging dieline",
    category: "tuckend",
    formats: ["AI", "PDF", "DXF"],
    image: "https://cdn.pacdora.com/preview/dieline-102010.png"
  },
  {
    id: 4,
    name: "FEFCO 0217 carrying handle top - snap lock bottom box dieline",
    category: "fefco",
    formats: ["AI", "PDF", "DXF"],
    image: "https://cdn.pacdora.com/preview/dieline-112310.png"
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
    formats: ["AI", "PDF", "DXF"],
    image: "https://cdn.pacdora.com/model/7000ee01-864c-4da3-bb39-ef2a2ffcfaff.png"
  },
  {
    id: 7,
    name: "FEFCO 0201 regular slotted box (RSC) dieline",
    category: "fefco",
    formats: ["AI", "PDF", "DXF"],
    image: "https://cdn.pacdora.com/admin-materials/c3c5f189-a097-4d47-aa89-06280795a325.png"
  },
  {
    id: 8,
    name: "FEFCO 0426 tray with front self locking walls and hinged lid dieline",
    category: "tray",
    formats: ["AI", "PDF", "DXF"],
    image: "https://cdn.pacdora.com/preview/dieline-156210.png"
  },
  {
    id: 9,
    name: "Cosmetic box dieline",
    category: "folding",
    formats: ["AI", "PDF", "DXF"],
    image: "https://cdn.pacdora.com/preview/dieline-102680.png"
  },
  {
    id: 10,
    name: "Square cosmetics jar box dieline",
    category: "folding",
    formats: ["AI", "PDF", "DXF"],
    image: "https://cdn.pacdora.com/model/2f74ac29-7486-4f57-9045-8298418c00d2.png"
  },
  {
    id: 11,
    name: "FEFCO 0300 full telescope side slotted box (FTSSC) dieline",
    category: "fefco",
    formats: ["AI", "PDF", "DXF"],
    image: "https://cdn.pacdora.com/preview/dieline-160010.png"
  },
  {
    id: 12,
    name: "Flip top magnetic gift box dieline",
    category: "rigid",
    formats: ["AI", "PDF", "DXF"],
    image: "https://cdn.pacdora.com/admin-materials/1c405ad1-2668-4d8a-85ed-3226a7bbaf0f.png"
  },
  {
    id: 13,
    name: "Drawer gift box dieline",
    category: "rigid",
    formats: ["AI", "PDF", "DXF"],
    image: "https://cdn.pacdora.com/admin-materials/2d927845-fe88-4ff2-ac7b-8bfd545d02fe.png"
  },
  {
    id: 14,
    name: "Auto lock bottom box dieline",
    category: "tuckend",
    formats: ["AI", "PDF", "DXF"],
    image: "https://cdn.pacdora.com/preview/dieline-105010.png"
  },
  {
    id: 15,
    name: "FEFCO 0427 roll end tray with locking cover dieline",
    category: "tray",
    formats: ["AI", "PDF", "DXF"],
    image: "https://cdn.pacdora.com/preview/dieline-150011.png"
  },
  {
    id: 16,
    name: "Paper shopping bag dieline",
    category: "bags",
    formats: ["AI", "PDF", "DXF"],
    image: "https://cdn.pacdora.com/preview/dieline-220010.png"
  },
  {
    id: 17,
    name: "Tuck end card game box dieline",
    category: "tuckend",
    formats: ["AI", "PDF", "DXF"],
    image: "https://cdn.pacdora.com/model/32142576-7b04-4071-8134-aaacb49ccf62.png"
  },
  {
    id: 18,
    name: "Food drawer box dieline",
    category: "rigid",
    formats: ["AI", "PDF", "DXF"],
    image: "https://cdn.pacdora.com/preview/dieline-128030.png"
  },
  {
    id: 19,
    name: "Cake box with handle dieline",
    category: "folding",
    formats: ["AI", "PDF", "DXF"],
    image: "https://cdn.pacdora.com/model/b7906593-3067-4849-8aff-bbe95a776442.png"
  },
  {
    id: 20,
    name: "Face Cream Open tuck end box dieline",
    category: "tuckend",
    formats: ["AI", "PDF", "DXF"],
    image: "https://cdn.pacdora.com/model/1484c3fc-7efe-409c-980d-084c5caa0191.png"
  }
];

export default function DielinePage({ onBack }) {
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const allDielines = useMemo(() => REAL_DIELINE_DATA, []);

  const filteredDielines = useMemo(() => {
    return allDielines.filter(dieline => {
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
              <div key={dieline.id} className="dieline-card">
                <div className="dieline-card-image">
                  <img src={dieline.image} alt={dieline.name} />
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
