import Link from 'next/link';

export default function Navbar() {
  return (
    <nav style={{
      width: '100%',
      background: '#fff',
      boxShadow: '0 2px 12px #e3e8f0',
      padding: '0 0',
      position: 'sticky',
      top: 0,
      zIndex: 100,
      marginBottom: 32,
    }}>
      <div style={{
        maxWidth: 1200,
        margin: '0 auto',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        height: 64,
        padding: '0 32px',
      }}>
        <Link href="/" legacyBehavior>
          <a style={{
            fontWeight: 800,
            fontSize: 26,
            color: '#1976d2',
            textDecoration: 'none',
            letterSpacing: 1,
            fontFamily: 'Inter, Arial, sans-serif',
          }}>
            RouteIQ
          </a>
        </Link>
        <div style={{ display: 'flex', gap: 24 }}>
          <Link href="/heatmap" legacyBehavior>
            <a style={{ color: '#222', fontWeight: 600, fontSize: 17, textDecoration: 'none', padding: '6px 0', borderBottom: '2px solid transparent', transition: 'border 0.2s' }}>Heat Map</a>
          </Link>
          <Link href="/fleet" legacyBehavior>
            <a style={{ color: '#222', fontWeight: 600, fontSize: 17, textDecoration: 'none', padding: '6px 0', borderBottom: '2px solid transparent', transition: 'border 0.2s' }}>Fleet Info</a>
          </Link>
        </div>
      </div>
    </nav>
  );
}
