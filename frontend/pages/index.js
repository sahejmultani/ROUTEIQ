


import Navbar from '../components/Navbar';

const cardStyle = {
  background: 'rgba(255,255,255,0.97)',
  borderRadius: 20,
  boxShadow: '0 2px 12px #e3e8f0',
  padding: 40,
  maxWidth: 480,
  margin: 'auto',
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  border: '1px solid #e3e8f0',
  animation: 'fadeInCard 0.7s',
};

const buttonStyle = {
  background: '#222',
  color: '#fff',
  padding: '14px 32px',
  borderRadius: 10,
  fontWeight: 600,
  fontSize: 18,
  textDecoration: 'none',
  boxShadow: '0 2px 8px #e3e8f0',
  transition: 'background 0.18s, box-shadow 0.18s',
  border: 'none',
  margin: '0 10px',
  outline: 'none',
  cursor: 'pointer',
  fontFamily: 'Poppins, Inter, Arial, sans-serif',
  letterSpacing: 0.2,
};

export default function Landing() {
  return (
    <div style={{
      minHeight: '100vh',
      background: '#f7f8fa',
      fontFamily: 'Poppins, Inter, Arial, sans-serif',
      display: 'flex',
      flexDirection: 'column',
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
          <h1 style={{ fontSize: '2.4rem', fontWeight: 800, color: '#222', marginBottom: 14, letterSpacing: 0.5, fontFamily: 'Poppins, Inter, Arial, sans-serif' }}>
            RouteIQ
          </h1>
          <p style={{ fontSize: 18, color: '#555', marginBottom: 32, maxWidth: 400, textAlign: 'center', fontWeight: 400, fontFamily: 'Poppins, Inter, Arial, sans-serif' }}>
            Visualize high-risk driving areas and manage your fleet with real-time telematics data.
          </p>
          <div style={{ display: 'flex', gap: 18 }}>
            <a href="/heatmap" style={buttonStyle}>View Heat Map</a>
            <a href="/fleet" style={{ ...buttonStyle, background: '#fff', color: '#222', border: '1.5px solid #222', fontWeight: 600 }}>Fleet & Vehicle Info</a>
          </div>
        </div>
      </div>
    </div>
  );
}
