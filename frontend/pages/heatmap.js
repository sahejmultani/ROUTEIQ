
import dynamic from 'next/dynamic';
import Head from 'next/head';
import Navbar from '../components/Navbar';

const Map = dynamic(() => import('../components/HeatMap'), { ssr: false });

const cardStyle = {
  background: 'rgba(255,255,255,0.97)',
  borderRadius: 20,
  boxShadow: '0 2px 12px #e3e8f0',
  padding: 40,
  maxWidth: 900,
  margin: '40px auto',
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  border: '1px solid #e3e8f0',
  animation: 'fadeInCard 0.7s',
};

export default function HeatmapPage() {
  return (
    <div style={{
      minHeight: '100vh',
      background: '#f7f8fa',
      fontFamily: 'Poppins, Inter, Arial, sans-serif',
      display: 'flex',
      flexDirection: 'column',
    }}>
      <Navbar />
      <Head>
        <title>Toronto Risk Heatmap</title>
        <meta name="description" content="High-risk driving areas in Toronto" />
      </Head>
      <main style={{ maxWidth: 1200, margin: '0 auto', padding: '2rem' }}>
        <div style={cardStyle}>
          <h1 style={{ fontWeight: 800, fontSize: '2.2rem', marginBottom: '1.2rem', color: '#222', letterSpacing: 0.5, fontFamily: 'Poppins, Inter, Arial, sans-serif' }}>
            Toronto High-Risk Driving Heatmap
          </h1>
          <p style={{ marginBottom: '2rem', color: '#555', fontSize: 17, fontWeight: 400, fontFamily: 'Poppins, Inter, Arial, sans-serif' }}>
            Visualizing high-risk areas based on telematics, hard braking, and speed violations.
          </p>
          <div style={{ width: '100%' }}>
            <Map />
          </div>
        </div>
      </main>
    </div>
  );
}
