
import { useState } from 'react';
import VehicleList from '../components/VehicleList';
import VehicleDetails from '../components/VehicleDetails';
import Head from 'next/head';
import Link from 'next/link';
import Navbar from '../components/Navbar';

export default function FleetPage() {
  const [selectedVehicle, setSelectedVehicle] = useState(null);
  const [selectedVehicleId, setSelectedVehicleId] = useState(null);

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif',
      display: 'flex',
      flexDirection: 'column',
    }}>
      <Navbar />

      <Head>
        <title>Fleet & Vehicle Info</title>
        <meta name="description" content="View and manage your fleet vehicles" />
      </Head>

      {/* Main Content */}
      <div style={{ padding: '40px 30px', maxWidth: '1400px', margin: '0 auto', width: '100%' }}>
        {/* Page Header */}
        <div style={{ marginBottom: '32px', color: '#fff' }}>
          <h2 style={{ margin: '0 0 12px 0', fontSize: '40px', fontWeight: 700 }}>Fleet & Vehicle Information</h2>
          <p style={{ margin: '0', fontSize: '16px', opacity: 0.9 }}>
            Browse your fleet and view real-time vehicle data
          </p>
        </div>

        {/* Fleet Content */}
        <div style={{ display: 'grid', gridTemplateColumns: '300px 1fr', gap: '28px', minHeight: '600px' }}>
          {/* Vehicle List Sidebar */}
          <div style={{ 
            background: 'rgba(255, 255, 255, 0.95)', 
            backdropFilter: 'blur(15px)', 
            padding: '24px', 
            borderRadius: '14px',
            boxShadow: '0 8px 32px rgba(0,0,0,0.15)',
            border: '1px solid rgba(255,255,255,0.3)',
            height: 'fit-content',
            position: 'sticky',
            top: '100px'
          }}>
            <h3 style={{ margin: '0 0 16px 0', fontSize: '16px', fontWeight: 700, color: '#222' }}>Vehicles</h3>
            <VehicleList onSelect={(v) => { setSelectedVehicle(v); setSelectedVehicleId(v?.id); }} />
          </div>

          {/* Vehicle Details Main */}
          <div style={{ 
            background: 'rgba(255, 255, 255, 0.95)', 
            backdropFilter: 'blur(15px)', 
            padding: '32px', 
            borderRadius: '14px',
            boxShadow: '0 8px 32px rgba(0,0,0,0.15)',
            border: '1px solid rgba(255,255,255,0.3)'
          }}>
            <VehicleDetails key={selectedVehicleId} vehicle={selectedVehicle} />
          </div>
        </div>
      </div>

      <style>{`
        * {
          box-sizing: border-box;
        }
      `}</style>
    </div>
  );
}
