import Link from 'next/link';

export default function Navbar() {
  return (
    <nav style={{
      width: '100%',
      background: 'rgba(255,255,255,0.85)',
      boxShadow: '0 4px 24px #e3e8f0',
      backdropFilter: 'blur(8px)',
      WebkitBackdropFilter: 'blur(8px)',
      position: 'sticky',
      top: 0,
      zIndex: 100,
      marginBottom: 32,
      borderBottom: '1.5px solid #e3e8f0',
    }}>
      <div style={{
        maxWidth: 1200,
        margin: '0 auto',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        height: 68,
        padding: '0 32px',
      }}>
        <Link href="/" legacyBehavior>
          <a style={{
            fontWeight: 900,
            fontSize: 28,
            color: 'linear-gradient(90deg,#1976d2,#43a047)',
            background: 'linear-gradient(90deg,#1976d2,#43a047)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            textDecoration: 'none',
            letterSpacing: 1.2,
            fontFamily: 'Poppins, Inter, Arial, sans-serif',
          }}>
            RouteIQ
          </a>
        </Link>
        <div style={{ display: 'flex', gap: 28 }}>
          <Link href="/heatmap" legacyBehavior>
            <a style={{ color: '#1976d2', fontWeight: 700, fontSize: 18, textDecoration: 'none', padding: '8px 0', borderBottom: '2.5px solid transparent', transition: 'border 0.2s', borderRadius: 4 }} onMouseOver={e => e.target.style.borderBottom = '2.5px solid #43a047'} onMouseOut={e => e.target.style.borderBottom = '2.5px solid transparent'}>Heat Map</a>
          </Link>
          <Link href="/fleet" legacyBehavior>
            <a style={{ color: '#1976d2', fontWeight: 700, fontSize: 18, textDecoration: 'none', padding: '8px 0', borderBottom: '2.5px solid transparent', transition: 'border 0.2s', borderRadius: 4 }} onMouseOver={e => e.target.style.borderBottom = '2.5px solid #43a047'} onMouseOut={e => e.target.style.borderBottom = '2.5px solid transparent'}>Fleet Info</a>
          </Link>
          <Link href="/risk-analysis" legacyBehavior>
            <a style={{ color: '#e74c3c', fontWeight: 700, fontSize: 18, textDecoration: 'none', padding: '8px 0', borderBottom: '2.5px solid transparent', transition: 'border 0.2s', borderRadius: 4 }} onMouseOver={e => e.target.style.borderBottom = '2.5px solid #e74c3c'} onMouseOut={e => e.target.style.borderBottom = '2.5px solid transparent'}>Risk Analysis</a>
          </Link>
          <Link href="/routing" legacyBehavior>
            <a style={{ color: '#f39c12', fontWeight: 700, fontSize: 18, textDecoration: 'none', padding: '8px 0', borderBottom: '2.5px solid transparent', transition: 'border 0.2s', borderRadius: 4 }} onMouseOver={e => e.target.style.borderBottom = '2.5px solid #f39c12'} onMouseOut={e => e.target.style.borderBottom = '2.5px solid transparent'}>Routes</a>
          </Link>
        </div>
      </div>
    </nav>
  );
}
