import { useState } from 'react';
import './HomePage.css';

export default function HomePage({ onNavigate }) {
  const [hoveredCard, setHoveredCard] = useState(null);

  const sections = [
    {
      id: 'mockup',
      title: 'Mockup Generator',
      description: 'Create stunning packaging mockups',
      color: 'purple',
      icon: '📦',
      images: ['📦', '👕', '🎒'],
      soon: true,
    },
    {
      id: '3d-modeling',
      title: '3D Modeling Software',
      description: 'Design 3D packaging models',
      color: 'teal',
      icon: '🎨',
      images: ['🎨', '🖼️', '✨'],
      soon: true,
    },
    {
      id: 'dieline',
      title: 'Dieline Template Maker',
      description: 'Browse 1,900+ Free Dieline Templates',
      color: 'blue',
      icon: '📄',
      badges: ['AI', 'PDF', 'DXF'],
    },
  ];

  const handleCardActivate = (section) => {
    if (!section.soon) onNavigate(section.id);
  };

  return (
    <div className="home-page">
      {/* Header */}
      <div className="home-header">
        <div className="header-content">
          <div className="logo-main">
            <span className="logo-icon-main">⬡</span>
            Packwave
          </div>
          <h1 className="header-title">
            All about packaging mockups & dieline templates at <span className="accent-text">Packwave</span>
          </h1>
        </div>
      </div>

      {/* Cards Grid */}
      <div className="cards-container">
        {sections.map((section) => (
          <div
            key={section.id}
            className={`section-card card-${section.color} ${section.soon ? 'card-soon' : ''}`}
            role="button"
            tabIndex={0}
            aria-label={section.soon ? `${section.title} (coming soon)` : section.title}
            onMouseEnter={() => setHoveredCard(section.id)}
            onMouseLeave={() => setHoveredCard(null)}
            onClick={() => handleCardActivate(section)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                handleCardActivate(section);
              }
            }}
          >
            {/* Card Content */}
            <div className="card-header">
              <h2 className="card-title">{section.title}</h2>
              <button className="card-arrow" aria-label="Go to section" tabIndex={-1}>
                <span>→</span>
              </button>
            </div>

            {/* Coming Soon badge */}
            {section.soon && <span className="card-soon-badge">Coming Soon</span>}

            {/* Card Images/Badges */}
            <div className="card-content">
              {section.badges ? (
                <div className="badge-group">
                  {section.badges.map((badge) => (
                    <span key={badge} className={`badge badge-${badge.toLowerCase()}`}>
                      {badge}
                    </span>
                  ))}
                </div>
              ) : (
                <div className="image-grid">
                  {section.images.map((img, idx) => (
                    <div key={idx} className="image-item">
                      {img}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Hover Overlay */}
            <div className="card-overlay">
              <span className="overlay-text">{section.description}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Footer */}
      <div className="home-footer">
        <p>Choose a service to get started</p>
      </div>
    </div>
  );
}
