import dynamic from 'next/dynamic';
import Head from 'next/head';

const Map = dynamic(() => import('../components/HeatMap'), { ssr: false });

export default function HeatmapPage() {
  return (
    <div style={{ background: '#fff', minHeight: '100vh', color: '#222' }}>
      <Head>
        <title>Toronto Risk Heatmap</title>
        <meta name="description" content="High-risk driving areas in Toronto" />
      </Head>
      <main style={{ maxWidth: 1200, margin: '0 auto', padding: '2rem' }}>
        <h1 style={{ fontWeight: 700, fontSize: '2.5rem', marginBottom: '1rem' }}>
          Toronto High-Risk Driving Heatmap
        </h1>
        <p style={{ marginBottom: '2rem', color: '#555' }}>
          Visualizing high-risk areas based on telematics, hard braking, and speed violations.
        </p>
        <Map />
      </main>
    </div>
  );
}
