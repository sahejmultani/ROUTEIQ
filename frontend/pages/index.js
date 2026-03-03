


import Navbar from '../components/Navbar';
import Link from 'next/link';

export default function Landing() {
  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif',
      display: 'flex',
      flexDirection: 'column',
    }}>
      <Navbar />

      {/* Main Content */}
      <div style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '40px 20px',
      }}>
        <div style={{ 
          background: 'rgba(255, 255, 255, 0.95)', 
          backdropFilter: 'blur(15px)', 
          padding: '60px 40px', 
          borderRadius: '16px', 
          maxWidth: '600px',
          textAlign: 'center',
          boxShadow: '0 8px 32px rgba(0,0,0,0.15)',
          border: '1px solid rgba(255,255,255,0.3)'
        }}>
          <div style={{ fontSize: '56px', marginBottom: '20px' }}>🚗</div>
          <h1 style={{ fontSize: '40px', fontWeight: 700, color: '#222', marginBottom: '16px', margin: '0 0 16px 0' }}>
            RouteIQ Fleet Management
          </h1>
          <p style={{ fontSize: '16px', color: '#666', marginBottom: '32px', lineHeight: '1.6', margin: '0 0 32px 0' }}>
            Visualize high-risk driving areas, analyze vehicle incidents, and manage your fleet with real-time telematics data powered by Geotab.
          </p>
          
          <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '12px', marginBottom: '32px' }}>
            <Link href="/risk-analysis" legacyBehavior>
              <a style={{
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                color: '#fff',
                padding: '14px 28px',
                borderRadius: '10px',
                textDecoration: 'none',
                fontWeight: 700,
                fontSize: '16px',
                border: 'none',
                cursor: 'pointer',
                transition: 'all 0.2s',
                display: 'block'
              }}>
                📊 View Risk Analysis
              </a>
            </Link>
            
            <Link href="/heatmap" legacyBehavior>
              <a style={{
                background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
                color: '#fff',
                padding: '14px 28px',
                borderRadius: '10px',
                textDecoration: 'none',
                fontWeight: 700,
                fontSize: '16px',
                border: 'none',
                cursor: 'pointer',
                transition: 'all 0.2s',
                display: 'block'
              }}>
                🗺️ View Heat Map & Routes
              </a>
            </Link>

            <Link href="/fleet" legacyBehavior>
              <a style={{
                background: 'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)',
                color: '#fff',
                padding: '14px 28px',
                borderRadius: '10px',
                textDecoration: 'none',
                fontWeight: 700,
                fontSize: '16px',
                border: 'none',
                cursor: 'pointer',
                transition: 'all 0.2s',
                display: 'block'
              }}>
                🚙 Fleet & Vehicle Info
              </a>
            </Link>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px', paddingTop: '24px', borderTop: '1px solid #e0e0e0' }}>
            <div>
              <div style={{ fontSize: '24px', marginBottom: '8px' }}>📊</div>
              <div style={{ fontSize: '12px', fontWeight: 700, color: '#667eea', textTransform: 'uppercase' }}>Risk Analysis</div>
              <div style={{ fontSize: '13px', color: '#666', marginTop: '4px' }}>Real-time incidents</div>
            </div>
            <div>
              <div style={{ fontSize: '24px', marginBottom: '8px' }}>🗺️</div>
              <div style={{ fontSize: '12px', fontWeight: 700, color: '#f5576c', textTransform: 'uppercase' }}>Heat Map</div>
              <div style={{ fontSize: '13px', color: '#666', marginTop: '4px' }}>Safe routing</div>
            </div>
            <div>
              <div style={{ fontSize: '24px', marginBottom: '8px' }}>🚙</div>
              <div style={{ fontSize: '12px', fontWeight: 700, color: '#38f9d7', textTransform: 'uppercase' }}>Fleet</div>
              <div style={{ fontSize: '13px', color: '#666', marginTop: '4px' }}>Vehicle data</div>
            </div>
          </div>
        </div>
      </div>

      <style>{`
        a {
          text-decoration: none;
        }
      `}</style>
    </div>
  );
}
