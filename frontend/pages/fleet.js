
import { useState } from 'react';
import VehicleList from '../components/VehicleList';
import VehicleDetails from '../components/VehicleDetails';
import Head from 'next/head';
import Navbar from '../components/Navbar';

const cardStyle = {
  background: '#fff',
  borderRadius: 18,
  boxShadow: '0 4px 24px #e3e8f0',
  padding: 40,
  maxWidth: 520,
  margin: '40px auto',
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
};

export default function FleetPage() {
  const [selectedVehicle, setSelectedVehicle] = useState(null);
  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #e0eafc 0%, #cfdef3 100%)',
      fontFamily: 'Inter, Arial, sans-serif',
    }}>
      <Navbar />
      <Head>
        <title>Fleet & Vehicle Info</title>
        <meta name="description" content="View and manage your fleet vehicles" />
      </Head>
      <main style={{ maxWidth: 1200, margin: '0 auto', padding: '2rem' }}>
        <div style={cardStyle}>
          <h1 style={{ fontWeight: 700, fontSize: '2.5rem', marginBottom: '1rem', color: '#1a237e' }}>
            Fleet & Vehicle Information
          </h1>
          <p style={{ marginBottom: '2rem', color: '#555', fontSize: 18 }}>
            Browse your fleet and view real-time vehicle data.
          </p>
          <VehicleList onSelect={setSelectedVehicle} />
          <VehicleDetails vehicle={selectedVehicle} />
        </div>
      </main>
    </div>
  );
}
