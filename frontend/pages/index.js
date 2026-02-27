


import Navbar from '../components/Navbar';

const cardStyle = {
  background: '#fff',
  borderRadius: 18,
  boxShadow: '0 4px 24px #e3e8f0',
  padding: 40,
  maxWidth: 480,
  margin: 'auto',
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
};

const buttonStyle = {
  background: '#1976d2',
  color: '#fff',
  padding: '18px 36px',
  borderRadius: 12,
  fontWeight: 600,
  fontSize: 20,
  textDecoration: 'none',
  boxShadow: '0 2px 12px #b3c6e0',
  transition: 'background 0.2s',
  border: 'none',
  margin: '0 12px',
  outline: 'none',
  cursor: 'pointer',
};

export default function Landing() {
  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #e0eafc 0%, #cfdef3 100%)',
      fontFamily: 'Inter, Arial, sans-serif',
    }}>
      <Navbar />
      <div style={{
        minHeight: 'calc(100vh - 64px)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
      }}>
        <div style={cardStyle}>
          <h1 style={{ fontSize: '2.8rem', fontWeight: 800, color: '#1a237e', marginBottom: 12 }}>
            Welcome to RouteIQ
          </h1>
          <p style={{ fontSize: 20, color: '#333', marginBottom: 36, maxWidth: 420, textAlign: 'center' }}>
            Visualize high-risk driving areas and manage your fleet with real-time telematics data.
          </p>
          <div style={{ display: 'flex', gap: 24 }}>
            <a href="/heatmap" style={buttonStyle}>View Heat Map</a>
            <a href="/fleet" style={{ ...buttonStyle, background: '#fff', color: '#1976d2', border: '2px solid #1976d2' }}>
              Fleet & Vehicle Info
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
