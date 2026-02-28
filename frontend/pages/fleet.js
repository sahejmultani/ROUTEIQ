
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
  const [selectedVehicleId, setSelectedVehicleId] = useState(null);
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
        <title>Fleet & Vehicle Info</title>
        <meta name="description" content="View and manage your fleet vehicles" />
      </Head>
      <main style={{ maxWidth: 1400, margin: '0 auto', padding: '2rem 0' }}>
        <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'flex-start', gap: 28, minHeight: 600 }}>
          <VehicleList onSelect={(v) => { setSelectedVehicle(v); setSelectedVehicleId(v?.id); }} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <h1 style={{ fontWeight: 700, fontSize: '2rem', marginBottom: '1rem', color: '#222' }}>
              Fleet & Vehicle Information
            </h1>
            <p style={{ marginBottom: '2rem', color: '#555', fontSize: 16 }}>
              Browse your fleet and view real-time vehicle data.
            </p>
            {/* Pass key to force remount on vehicle change */}
            <VehicleDetails key={selectedVehicleId} vehicle={selectedVehicle} />
          </div>
        </div>
      </main>
    </div>
  );
}
