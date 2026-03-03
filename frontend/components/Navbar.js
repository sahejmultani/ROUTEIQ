import Link from 'next/link';
import { useRouter } from 'next/router';

export default function Navbar() {
  const router = useRouter();

  const isActive = (path) => {
    return router.pathname === path;
  };

  const navLinkStyle = (path) => ({
    color: '#fff',
    textDecoration: 'none',
    fontSize: '14px',
    padding: '8px 16px',
    borderRadius: '8px',
    transition: 'all 0.2s',
    background: isActive(path) ? 'rgba(255,255,255,0.2)' : 'transparent',
    fontWeight: isActive(path) ? 700 : 600,
    border: isActive(path) ? '1px solid rgba(255,255,255,0.3)' : '1px solid transparent',
    display: 'inline-block'
  });

  return (
    <nav style={{
      background: 'rgba(0, 0, 0, 0.1)',
      backdropFilter: 'blur(10px)',
      borderBottom: '1px solid rgba(255,255,255,0.1)',
      padding: '16px 30px',
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      position: 'sticky',
      top: 0,
      zIndex: 100
    }}>
      {/* Logo & Branding */}
      <Link href="/" legacyBehavior>
        <a style={{
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          textDecoration: 'none'
        }}>
          <div style={{ fontSize: '28px' }}>🚗</div>
          <h1 style={{
            margin: '0',
            color: '#fff',
            fontSize: '22px',
            fontWeight: 700,
            letterSpacing: '0.5px'
          }}>
            RouteIQ
          </h1>
        </a>
      </Link>

      {/* Navigation Links */}
      <div style={{
        display: 'flex',
        gap: '8px',
        alignItems: 'center'
      }}>
        <Link href="/" legacyBehavior>
          <a style={navLinkStyle('/')}>
            🏠 Home
          </a>
        </Link>

        <Link href="/risk-analysis" legacyBehavior>
          <a style={navLinkStyle('/risk-analysis')}>
            📊 Risk Analysis
          </a>
        </Link>

        <Link href="/heatmap" legacyBehavior>
          <a style={navLinkStyle('/heatmap')}>
            🗺️ Heatmap
          </a>
        </Link>

        <Link href="/fleet" legacyBehavior>
          <a style={navLinkStyle('/fleet')}>
            🚙 Fleet
          </a>
        </Link>
      </div>
    </nav>
  );
}
