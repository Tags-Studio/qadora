import React, { useState, useMemo, useEffect } from 'react';
import pacdoraDielines from '../data/pacdora_dielines.json';
import './DielinePage.css';

export default function DielinePage({ onBack, onSelectDieline }) {
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [visibleCount, setVisibleCount] = useState(24);

  // Compute category counts dynamically based on the 7,396 items
  const categoriesList = useMemo(() => {
    const counts = {
      all: pacdoraDielines.length,
      fefco: 0,
      tuckend: 0,
      folding: 0,
      tray: 0,
      rigid: 0,
      bags: 0
    };

    pacdoraDielines.forEach(item => {
      if (counts[item.category] !== undefined) {
        counts[item.category]++;
      }
    });

    return [
      { id: 'all', name: 'All Dielines', count: counts.all },
      { id: 'fefco', name: 'FEFCO', count: counts.fefco },
      { id: 'tuckend', name: 'Tuck End Box', count: counts.tuckend },
      { id: 'folding', name: 'Folding Carton', count: counts.folding },
      { id: 'tray', name: 'Tray & Box', count: counts.tray },
      { id: 'rigid', name: 'Rigid Box', count: counts.rigid },
      { id: 'bags', name: 'Paper Bag', count: counts.bags }
    ];
  }, []);

  // Filter templates based on selected category and search query
  const filteredDielines = useMemo(() => {
    return pacdoraDielines.filter(dieline => {
      const matchCategory = selectedCategory === 'all' || dieline.category === selectedCategory;
      const matchSearch = dieline.name.toLowerCase().includes(searchTerm.toLowerCase());
      return matchCategory && matchSearch;
    });
  }, [selectedCategory, searchTerm]);

  // Reset pagination visible count on search or category filter change
  useEffect(() => {
    setVisibleCount(24);
  }, [selectedCategory, searchTerm]);

  // Paginated list to render in DOM
  const paginatedDielines = useMemo(() => {
    return filteredDielines.slice(0, visibleCount);
  }, [filteredDielines, visibleCount]);

  const handleLoadMore = () => {
    setVisibleCount(prev => prev + 24);
  };

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
              placeholder="Search 7,000+ templates by keywords (e.g. mailer, cosmetic, shipping...)"
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
              {categoriesList.map((category) => (
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
                : `${categoriesList.find(c => c.id === selectedCategory)?.name}`}
            </h2>
            <p className="results-count">{filteredDielines.length} Templates</p>
          </div>

          {/* Grid of Dielines */}
          <div className="dieline-grid">
            {paginatedDielines.map((dieline) => (
              <div
                key={dieline.id}
                className="dieline-card"
                onClick={() => onSelectDieline?.(dieline)}
                style={{ cursor: 'pointer' }}
              >
                {/* Split Thumbnail: Left side shows detailed Dieline (blue/red), Right side shows Pacdora 3D mockup */}
                <div className="dieline-card-image split-thumbnail">
                  <div className="thumbnail-2d-side detailed-vector-bg">
                    <img 
                      src={dieline.dieline_image} 
                      alt={`${dieline.name} dieline`} 
                      loading="lazy" 
                      onError={(e) => {
                        // Fallback in case S3 image fails to load
                        e.target.style.display = 'none';
                      }}
                    />
                  </div>
                  <div className="thumbnail-3d-side">
                    <img 
                      src={dieline.image} 
                      alt={dieline.name} 
                      loading="lazy" 
                      onError={(e) => {
                        // Fallback in case render image fails to load
                        e.target.src = '/images/mockups/tuck-end-box.png';
                      }}
                    />
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

          {/* Pagination / Load More Button */}
          {filteredDielines.length > visibleCount && (
            <div className="load-more-container">
              <button onClick={handleLoadMore} className="load-more-btn">
                Load More Templates ({filteredDielines.length - visibleCount} remaining)
              </button>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
