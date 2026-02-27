
import dynamic from 'next/dynamic';
import Head from 'next/head';
import Navbar from '../components/Navbar';

const Map = dynamic(() => import('../components/HeatMap'), { ssr: false });

const cardStyle = {
  background: '#fff',
  borderRadius: 18,
  boxShadow: '0 4px 24px #e3e8f0',
  padding: 40,
  maxWidth: 900,
  margin: '40px auto',
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
};

export default function HeatmapPage() {
  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #e0eafc 0%, #cfdef3 100%)',
      fontFamily: 'Inter, Arial, sans-serif',
    }}>
      <Navbar />
      <Head>
        <title>Toronto Risk Heatmap</title>
        <meta name="description" content="High-risk driving areas in Toronto" />
      </Head>
      <main style={{ maxWidth: 1200, margin: '0 auto', padding: '2rem' }}>
        <div style={cardStyle}>
          <h1 style={{ fontWeight: 700, fontSize: '2.5rem', marginBottom: '1rem', color: '#1a237e' }}>
            Toronto High-Risk Driving Heatmap
          </h1>
          <p style={{ marginBottom: '2rem', color: '#555', fontSize: 18 }}>
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
