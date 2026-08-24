import React from 'react';

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, info) {
    console.error('App crashed:', error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '16px',
          background: 'var(--bg-base, #0d0c0a)',
          color: 'var(--text-primary, #f0e8df)',
          fontFamily: "'DM Sans', sans-serif",
          textAlign: 'center',
          padding: '24px',
        }}>
          <span style={{ fontSize: '40px' }}>⚠️</span>
          <h1 style={{ fontSize: '1.2rem', margin: 0 }}>حدث خطأ غير متوقع</h1>
          <p style={{ color: 'var(--text-secondary, #9a8e84)', margin: 0, maxWidth: '420px' }}>
            صادف المشروع مشكلة أثناء التشغيل. جرّب إعادة تحميل الصفحة.
          </p>
          <button
            onClick={() => window.location.reload()}
            style={{
              background: 'var(--accent, #ff6b35)',
              color: '#fff',
              border: 'none',
              borderRadius: '10px',
              padding: '10px 22px',
              fontSize: '0.9rem',
              cursor: 'pointer',
            }}
          >
            ↺ إعادة التحميل
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
