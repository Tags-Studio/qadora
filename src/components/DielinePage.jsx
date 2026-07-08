import { useState, useMemo } from 'react';
import './DielinePage.css';

// Sample dieline data - can be replaced with API call
const DIELINE_CATEGORIES = [
  { id: 'all', name: 'All', count: 1928 },
  { id: 'fefco', name: 'FEFCO Boxes', count: 116 },
  { id: 'folding', name: 'Folding Boxes', count: 430 },
  { id: 'tray', name: 'Tray Boxes', count: 120 },
  { id: 'display', name: 'Display Boxes', count: 187 },
  { id: 'tuckend', name: 'Tuck End Boxes', count: 282 },
  { id: 'inserts', name: 'Box Inserts', count: 63 },
  { id: 'bags', name: 'Paper Bags', count: 28 },
  { id: 'rigid', name: 'Rigid Boxes', count: 60 },
  { id: 'window', name: 'Window Boxes', count: 109 },
  { id: 'lid', name: 'Boxes with Lid', count: 93 },
  { id: 'storage', name: 'Storage Boxes', count: 44 },
];

// Sample dieline templates
const generateDielineData = () => {
  const templates = [];
  const categories = ['fefco', 'folding', 'tray', 'display', 'tuckend', 'inserts', 'bags', 'rigid', 'window', 'lid', 'storage'];
  
  for (let i = 1; i <= 50; i++) {
    templates.push({
      id: i,
      name: `Dieline Template ${i}`,
      category: categories[i % categories.length],
      formats: ['AI', 'PDF', 'DXF'],
      image: `https://via.placeholder.com/250x200?text=Template+${i}`,
    });
  }
  return templates;
};

export default function DielinePage({ onBack }) {
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const allDielines = useMemo(() => generateDielineData(), []);

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
