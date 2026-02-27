

import Link from 'next/link';

export default function Landing() {
  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #e0eafc 0%, #cfdef3 100%)',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      fontFamily: 'Inter, Arial, sans-serif',
    }}>
      <h1 style={{ fontSize: '2.8rem', fontWeight: 800, color: '#1a237e', marginBottom: 12 }}>
        Welcome to RouteIQ
      </h1>
      <p style={{ fontSize: 20, color: '#333', marginBottom: 36, maxWidth: 420, textAlign: 'center' }}>
        Visualize high-risk driving areas and manage your fleet with real-time telematics data.
      </p>
      <div style={{ display: 'flex', gap: 32 }}>
        <Link href="/heatmap" legacyBehavior>
          <a style={{
            background: '#1976d2',
            color: '#fff',
            padding: '18px 36px',
            borderRadius: 12,
            fontWeight: 600,
            fontSize: 20,
            textDecoration: 'none',
            boxShadow: '0 2px 12px #b3c6e0',
            transition: 'background 0.2s',
          }}>
            View Heat Map
          </a>
        </Link>
        <Link href="/fleet" legacyBehavior>
          <a style={{
            background: '#fff',
            color: '#1976d2',
            padding: '18px 36px',
            borderRadius: 12,
            fontWeight: 600,
            fontSize: 20,
            textDecoration: 'none',
            border: '2px solid #1976d2',
            boxShadow: '0 2px 12px #b3c6e0',
            transition: 'background 0.2s',
          }}>
            Fleet & Vehicle Info
          </a>
        </Link>
      </div>
    </div>
  );
}
