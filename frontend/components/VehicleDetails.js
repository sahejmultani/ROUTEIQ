
import { useEffect, useState } from 'react';

export default function VehicleDetails({ vehicle }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!vehicle) return;
    setLoading(true);
    setError(null);
    fetch(`http://localhost:8000/api/vehicle/${vehicle.id}`)
      .then((res) => res.json())
      .then(setData)
      .catch(setError)
      .finally(() => setLoading(false));
  }, [vehicle]);

  if (!vehicle) return null;
  if (loading) return <div>Loading vehicle data...</div>;
  if (error) return <div>Error loading vehicle data.</div>;
  if (!data) return null;

  return (
    <div style={{
      marginBottom: 32,
      background: '#fff',
      borderRadius: 18,
      boxShadow: '0 4px 24px #e3e8f0',
      padding: 32,
      maxWidth: 480,
      marginLeft: 'auto',
      marginRight: 'auto',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'flex-start',
    }}>
      <h3 style={{ fontSize: 22, fontWeight: 700, marginBottom: 18, color: '#1a237e', letterSpacing: 0.2 }}>Vehicle Details</h3>
      <div style={{ fontSize: 17, marginBottom: 8 }}><b>Name:</b> {vehicle.name}</div>
      <div style={{ fontSize: 17, marginBottom: 8 }}><b>VIN:</b> {vehicle.vin}</div>
      <div style={{ fontSize: 17, marginBottom: 8 }}><b>License Plate:</b> {vehicle.licensePlate}</div>
      <div style={{ fontSize: 17, marginBottom: 18 }}><b>Device Type:</b> {vehicle.deviceType}</div>
      <div style={{ width: '100%' }}>
        <div style={{ fontWeight: 600, color: '#1976d2', marginBottom: 8, fontSize: 16 }}>Status Data</div>
        {Array.isArray(data) && data.length > 0 ? (
          <ul style={{
            background: '#f7fafd',
            borderRadius: 10,
            padding: 18,
            fontSize: 15.5,
            maxHeight: 220,
            overflow: 'auto',
            margin: 0,
            boxShadow: '0 2px 8px #f0f4fa',
            width: '100%',
          }}>
            {Object.entries(data[0]).map(([field, value]) => (
              <li key={field} style={{ marginBottom: 7, listStyle: 'none', display: 'flex', alignItems: 'center' }}>
                <span style={{ color: '#1a237e', fontWeight: 600, minWidth: 90 }}>{field}:</span>
                <span style={{ marginLeft: 8, color: '#333' }}>{typeof value === 'object' ? JSON.stringify(value) : String(value)}</span>
              </li>
            ))}
          </ul>
        ) : (
          <div style={{ color: '#888', fontStyle: 'italic' }}>No status data available.</div>
        )}
      </div>
    </div>
  );
}
