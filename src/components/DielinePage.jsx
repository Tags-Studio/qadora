import React, { useState, useMemo, useEffect, useRef } from 'react';
import pacdoraDielines from '../data/pacdora_dielines.json';
import animatedNums from '../data/animated_dielines.json';
import './DielinePage.css';

const ANIMATED_SET = new Set(animatedNums);

export default function DielinePage({ onBack, onSelectDieline }) {
  // Filter States
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [visibleCount, setVisibleCount] = useState(24);
  const [sortBy, setSortBy] = useState('popular');
  const [viewMode, setViewMode] = useState('grid'); // 'grid' or 'list'
  
  // Checkbox Filter States (Box Style & Closure Type)
  const [selectedStyles, setSelectedStyles] = useState([]);
  const [selectedClosures, setSelectedClosures] = useState([]);

  // Mobile Drawer State
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  // Search input ref for shortcut key
  const searchInputRef = useRef(null);

  // Keydown handler for ⌘K or Ctrl+K shortcut
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Category Configuration
  const CATEGORIES = useMemo(() => [
    { id: 'all', name: 'All Templates', icon: 'fa-border-all' },
    { id: 'animated', name: 'Animated 3D', icon: 'fa-magic' },
    { id: 'tuckend', name: 'Tuck End Boxes', icon: 'fa-box' },
    { id: 'mailer', name: 'Mailer Boxes', icon: 'fa-envelope-open' },
    { id: 'gable', name: 'Gable & Handle', icon: 'fa-shopping-bag' },
    { id: 'pillow', name: 'Pillow Boxes', icon: 'fa-cloud' },
    { id: 'sleeve', name: 'Sleeve Boxes', icon: 'fa-box-open' },
    { id: 'twopiece', name: 'Two-Piece Boxes', icon: 'fa-boxes' },
    { id: 'window', name: 'Window Cut', icon: 'fa-square' },
    { id: 'autolock', name: 'Auto Lock Bottom', icon: 'fa-lock' },
    { id: 'tray', name: 'Tray & Display', icon: 'fa-layer-group' },
    { id: 'hanger', name: 'Hanger Boxes', icon: 'fa-tag' },
    { id: 'hexagonal', name: 'Hexagonal Tubes', icon: 'fa-circle-notch' }
  ], []);

  // Dynamic Count calculations based on database
  const categoryCounts = useMemo(() => {
    const counts = { all: pacdoraDielines.length };
    CATEGORIES.forEach(cat => {
      if (cat.id !== 'all') counts[cat.id] = 0;
    });
    
    pacdoraDielines.forEach(item => {
      if (counts[item.category] !== undefined) {
        counts[item.category]++;
      }
    });

    return counts;
  }, [CATEGORIES]);

  // Handle Box Style Toggle
  const handleStyleToggle = (style) => {
    setSelectedStyles(prev => 
      prev.includes(style) ? prev.filter(s => s !== style) : [...prev, style]
    );
  };

  // Handle Closure Type Toggle
  const handleClosureToggle = (closure) => {
    setSelectedClosures(prev => 
      prev.includes(closure) ? prev.filter(c => c !== closure) : [...prev, closure]
    );
  };

  // Filter templates based on all active criteria
  const filteredDielines = useMemo(() => {
    let result = pacdoraDielines.filter(dieline => {
      // 1. Category Filter (including special 'animated' filter)
      const matchCategory = selectedCategory === 'all' || 
        (selectedCategory === 'animated' ? ANIMATED_SET.has(dieline.num) : dieline.category === selectedCategory);

      // 2. Search Keyword Filter
      const matchSearch = dieline.name.toLowerCase().includes(searchTerm.toLowerCase());

      // 3. Box Style Checkbox Filter
      const matchStyle = selectedStyles.length === 0 || selectedStyles.includes(dieline.style);

      // 4. Closure Type Checkbox Filter
      const matchClosure = selectedClosures.length === 0 || selectedClosures.includes(dieline.closure);

      return matchCategory && matchSearch && matchStyle && matchClosure;
    });

    // 5. Sorting
    if (sortBy === 'newest') {
      result = [...result].reverse(); // Fake newest by reversing
    } else if (sortBy === 'alphabetical') {
      result = [...result].sort((a, b) => a.name.localeCompare(b.name));
    }

    return result;
  }, [selectedCategory, searchTerm, selectedStyles, selectedClosures, sortBy]);

  // Reset page count on filter change
  useEffect(() => {
    setVisibleCount(24);
  }, [selectedCategory, searchTerm, selectedStyles, selectedClosures, sortBy]);

  const handleLoadMore = () => {
    setVisibleCount(prev => prev + 24);
  };

  return (
    <div className="dieline-saas-layout">
      {/* 80px High Premium Header */}
      <header className="saas-header">
        <div className="header-left">
          <a href="javascript:void(0)" onClick={onBack} className="saas-brand">
            <div className="logo-icon">
              <i className="fas fa-cube text-white"></i>
            </div>
            <span className="brand-text">Dieline.lib</span>
          </a>
          <nav className="saas-nav">
            <a href="javascript:void(0)" onClick={onBack} className="nav-link active">Dieline Templates</a>
            <a href="#" className="nav-link">Box Builder</a>
            <a href="#" className="nav-link">3D Preview</a>
            <a href="#" className="nav-link">Pricing</a>
            <a href="#" className="nav-link">Resources</a>
          </nav>
        </div>

        {/* Large 420px Wide Search Bar */}
        <div className="header-search">
          <i className="fas fa-search search-icon"></i>
          <input
            ref={searchInputRef}
            type="text"
            placeholder="Search box templates..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          <span className="search-hint">Ctrl+K</span>
        </div>

        <div className="header-right">
          <a href="#" className="signin-link">Sign In</a>
          <a href="#" className="cta-button-dark">Start free</a>
          <button className="mobile-hamburger" onClick={() => setIsSidebarOpen(true)}>
            <i className="fas fa-bars"></i>
          </button>
        </div>
      </header>

      {/* Main App Layout */}
      <div className="saas-container">
        
        {/* ===== SIDEBAR PANEL ===== */}
        <aside className={`saas-sidebar ${isSidebarOpen ? 'open' : ''}`}>
          <div className="sidebar-header-mobile">
            <span className="sidebar-mobile-title">Filters</span>
            <button className="close-sidebar-btn" onClick={() => setIsSidebarOpen(false)}>
              <i className="fas fa-times"></i>
            </button>
          </div>

          <div className="sidebar-section">
            <p className="sidebar-sec-title">Categories</p>
            <div className="sidebar-menu-list">
              {CATEGORIES.map(cat => (
                <button
                  key={cat.id}
                  className={`sidebar-menu-item ${selectedCategory === cat.id ? 'active' : ''}`}
                  onClick={() => {
                    setSelectedCategory(cat.id);
                    setIsSidebarOpen(false); // Close drawer on mobile
                  }}
                >
                  <div className="menu-item-left">
                    <i className={`fas ${cat.icon} menu-icon`}></i>
                    <span>{cat.name}</span>
                  </div>
                  <span className="menu-badge">{categoryCounts[cat.id]}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="sidebar-divider"></div>

          {/* Box Style Checkbox Group */}
          <div className="sidebar-section">
            <p className="sidebar-sec-title">Box Style</p>
            <div className="checkbox-stack">
              {['Folding Carton', 'Rigid Box', 'Corrugated', 'Tube & Core'].map(style => (
                <label key={style} className="checkbox-item">
                  <input
                    type="checkbox"
                    checked={selectedStyles.includes(style)}
                    onChange={() => handleStyleToggle(style)}
                  />
                  <span className="checkbox-custom"></span>
                  <span className="checkbox-lbl">{style}</span>
                </label>
              ))}
            </div>
          </div>

          <div className="sidebar-divider"></div>

          {/* Closure Type Checkbox Group */}
          <div className="sidebar-section">
            <p className="sidebar-sec-title">Closure Type</p>
            <div className="checkbox-stack">
              {['Tuck End', 'Auto Lock', 'Snap Lock', 'Hinged Lid', 'Magnetic'].map(closure => (
                <label key={closure} className="checkbox-item">
                  <input
                    type="checkbox"
                    checked={selectedClosures.includes(closure)}
                    onChange={() => handleClosureToggle(closure)}
                  />
                  <span className="checkbox-custom"></span>
                  <span className="checkbox-lbl">{closure}</span>
                </label>
              ))}
            </div>
          </div>
        </aside>

        {/* Mobile Sidebar Overlay */}
        {isSidebarOpen && <div className="sidebar-overlay" onClick={() => setIsSidebarOpen(false)}></div>}

        {/* ===== MAIN CONTENT AREA ===== */}
        <main className="saas-content">
          
          {/* 500px High Premium Hero Card */}
          <div className="saas-hero-card">
            {/* Blur Gradient Backgrounds for depth */}
            <div className="hero-blur-orange"></div>
            <div className="hero-blur-blue"></div>
            <div className="hero-blur-green"></div>

            <div className="hero-inner-content">
              <div className="hero-badge">
                <span>Updated weekly · Free for commercial use</span>
              </div>
              <h2 className="hero-title">
                1,928 Free Printable<br />
                <span className="text-highlight">Box Dieline</span> Templates
              </h2>
              <p className="hero-description">
                Download production-ready packaging dielines with precise cut, fold, and glue lines. 
                Every template includes a 2D flat dieline and 3D assembled preview — ready for AI, PDF, DXF, and SVG workflows.
              </p>

              {/* 4-Column Stats */}
              <div className="hero-stats-grid">
                <div className="stat-column">
                  <span className="stat-number">1,928</span>
                  <span className="stat-label">Templates</span>
                </div>
                <div className="stat-column">
                  <span className="stat-number">12</span>
                  <span className="stat-label">Box Categories</span>
                </div>
                <div className="stat-column">
                  <span className="stat-number">5</span>
                  <span className="stat-label">File Formats</span>
                </div>
                <div className="stat-column">
                  <span className="stat-number">186k</span>
                  <span className="stat-label">Downloads</span>
                </div>
              </div>

              <div className="hero-buttons">
                <button className="btn-primary" onClick={() => {
                  setSelectedCategory('all');
                  setSelectedStyles([]);
                  setSelectedClosures([]);
                  setSearchTerm('');
                }}>Browse all templates</button>
                <a href="#" className="btn-secondary-outline">How it works</a>
              </div>
            </div>
          </div>

          {/* Toolbar for controls */}
          <div className="saas-toolbar">
            <div className="toolbar-left">
              <span className="results-text">
                Showing <b>{Math.min(visibleCount, filteredDielines.length)}</b> of <b>{filteredDielines.length}</b> templates
              </span>
            </div>
            
            <div className="toolbar-right">
              {/* Sort Dropdown */}
              <div className="sort-dropdown-container">
                <i className="fas fa-sort-amount-down sort-icon"></i>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="sort-select"
                >
                  <option value="popular">Most popular</option>
                  <option value="newest">Newest templates</option>
                  <option value="alphabetical">Alphabetical</option>
                </select>
              </div>

              {/* Grid/List View Toggles */}
              <div className="view-toggle-group">
                <button
                  className={`view-btn ${viewMode === 'grid' ? 'active' : ''}`}
                  onClick={() => setViewMode('grid')}
                  aria-label="Grid View"
                >
                  <i className="fas fa-th-large"></i>
                </button>
                <button
                  className={`view-btn ${viewMode === 'list' ? 'active' : ''}`}
                  onClick={() => setViewMode('list')}
                  aria-label="List View"
                >
                  <i className="fas fa-list"></i>
                </button>
              </div>
            </div>
          </div>

          {/* Cards Grid */}
          <div className={`saas-grid ${viewMode}`}>
            {filteredDielines.slice(0, visibleCount).map((dieline) => (
              <div
                key={dieline.id}
                className="saas-card"
                onClick={() => onSelectDieline?.(dieline)}
              >
                {/* Preview Image with Printable/Downloadable Pills */}
                <div className="saas-card-preview split-thumbnail">
                  <div className="pills-overlay">
                    <span className="pill-badge">Printable</span>
                    <span className="pill-badge">Downloadable</span>
                  </div>

                  <div className="thumbnail-2d-side detailed-vector-bg">
                    <img
                      src={dieline.dieline_image}
                      alt={`${dieline.name} dieline`}
                      loading="lazy"
                      onError={(e) => {
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
                        e.target.src = '/images/mockups/tuck-end-box.png';
                      }}
                    />
                  </div>

                  <div className="card-hover-overlay">
                    <span className="overlay-btn">View & Edit</span>
                  </div>
                </div>

                {/* Card Info */}
                <div className="saas-card-footer">
                  <div className="card-tag-row">
                    <span className="card-tag">ALL TEMPLATES</span>
                    {ANIMATED_SET.has(dieline.num) && (
                      <span className="card-tag card-tag-animated">
                        <i className="fas fa-magic"></i> Animated
                      </span>
                    )}
                  </div>
                  <h4 className="card-title-text">{dieline.name}</h4>
                </div>
              </div>
            ))}
          </div>

          {/* Empty State */}
          {filteredDielines.length === 0 && (
            <div className="saas-empty-state">
              <i className="fas fa-box-open empty-icon"></i>
              <h3>No box templates found</h3>
              <p>Try adjusting your keyword search, categories, or style filters.</p>
            </div>
          )}

          {/* Pagination Load More */}
          {filteredDielines.length > visibleCount && (
            <div className="saas-load-more">
              <button className="load-more-btn" onClick={handleLoadMore}>
                Load More Templates ({filteredDielines.length - visibleCount} remaining)
              </button>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
