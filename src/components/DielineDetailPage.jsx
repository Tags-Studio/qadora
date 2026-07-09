import React, { useMemo } from 'react';
import './DielineDetailPage.css';

export default function DielineDetailPage({ dieline, onBack }) {
  const safeDieline = useMemo(() => {
    return dieline || { id: 1, name: 'Tuck End Box Dieline', dieline_image: '' };
  }, [dieline]);

  const pacdoraUUID = useMemo(() => {
    if (!safeDieline.dieline_image) return '';
    const match = safeDieline.dieline_image.match(/\/([a-f0-9\-]{36})\.png$/i);
    if (match) return match[1];
    const altMatch = safeDieline.dieline_image.match(/\/([a-f0-9\-]+)\.png$/i);
    return altMatch ? altMatch[1] : '';
  }, [safeDieline]);

  const iframeUrl = pacdoraUUID ? "https://www.pacdora.com/share?code=$pacdoraUUID" : 'https://www.pacdora.com';

  return (
    <div className="dieline-detail-layout" style={{ direction: 'ltr' }}>
      <header className="detail-header">
        <a href="#" onClick={(e) => { e.preventDefault(); onBack(); }} className="logo-section group">
          <div className="w-8 h-8 bg-emerald-500 rounded-lg flex items-center justify-center text-white transform group-hover:-rotate-12 transition duration-300">
            <i className="fas fa-cube"></i>
          </div>
          <span className="logo-text">Dieline.lib</span>
        </a>
        <nav className="header-nav">
          <a href="#" onClick={(e) => { e.preventDefault(); onBack(); }} className="nav-item active">Dieline Templates</a>
          <a href="#" className="nav-item">3D Viewer</a>
          <a href="#" className="nav-item">Resources</a>
          <a href="#" className="nav-item">Pricing</a>
        </nav>
        <div className="header-actions">
          <button className="w-8 h-8 flex items-center justify-center text-slate-400 hover:text-white rounded-lg hover:bg-white/5 transition" style={{ background: 'transparent', border: 'none', cursor: 'pointer' }} aria-label="Search">
            <i className="fas fa-search text-[13px] text-slate-400"></i>
          </button>
          <div className="hidden sm:flex items-center gap-2.5 ml-1.5 pl-3" style={{ borderLeft: '1px solid rgba(255,255,255,.08)' }}>
            <a href="#" className="action-link">Sign In</a>
            <a href="#" className="action-btn-primary">Get Started</a>
          </div>
        </div>
      </header>

      <main className="detail-main-content" style={{ display: 'block', padding: 0, height: 'calc(100vh - 52px)', width: '100%', overflow: 'hidden' }}>
        <iframe 
          src={iframeUrl}
          title={safeDieline.name}
          style={{ width: '100%', height: '100%', border: 'none' }}
          allowFullScreen
        />
      </main>
    </div>
  );
}
