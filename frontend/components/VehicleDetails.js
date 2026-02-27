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
    <div style={{ marginBottom: 24, background: '#fafbfc', borderRadius: 12, padding: 16, boxShadow: '0 2px 8px #eee' }}>
      <h3 style={{ fontSize: 18, fontWeight: 600, marginBottom: 8 }}>Vehicle Details</h3>
      <div><b>Name:</b> {vehicle.name}</div>
      <div><b>VIN:</b> {vehicle.vin}</div>
      <div><b>License Plate:</b> {vehicle.licensePlate}</div>
      <div><b>Device Type:</b> {vehicle.deviceType}</div>
      <div style={{ marginTop: 12 }}>
        <b>Status Data:</b>
        <pre style={{ background: '#f5f5f5', borderRadius: 8, padding: 8, fontSize: 13, maxHeight: 200, overflow: 'auto' }}>{JSON.stringify(data, null, 2)}</pre>
      </div>
    </div>
  );
}
