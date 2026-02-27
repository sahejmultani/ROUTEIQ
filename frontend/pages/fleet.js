import { useState } from 'react';
import VehicleList from '../components/VehicleList';
import VehicleDetails from '../components/VehicleDetails';
import Head from 'next/head';

export default function FleetPage() {
  const [selectedVehicle, setSelectedVehicle] = useState(null);
  return (
    <div style={{ background: '#fff', minHeight: '100vh', color: '#222' }}>
      <Head>
        <title>Fleet & Vehicle Info</title>
        <meta name="description" content="View and manage your fleet vehicles" />
      </Head>
      <main style={{ maxWidth: 1200, margin: '0 auto', padding: '2rem' }}>
        <h1 style={{ fontWeight: 700, fontSize: '2.5rem', marginBottom: '1rem' }}>
          Fleet & Vehicle Information
        </h1>
        <p style={{ marginBottom: '2rem', color: '#555' }}>
          Browse your fleet and view real-time vehicle data.
        </p>
        <VehicleList onSelect={setSelectedVehicle} />
        <VehicleDetails vehicle={selectedVehicle} />
      </main>
    </div>
  );
}
