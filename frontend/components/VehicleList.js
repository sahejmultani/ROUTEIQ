import { useEffect, useState } from 'react';

export default function VehicleList({ onSelect }) {
  const [vehicles, setVehicles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetch('http://localhost:8000/api/vehicles')
      .then((res) => res.json())
      .then(setVehicles)
      .catch(setError)
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div>Loading vehicles...</div>;
  if (error) return <div>Error loading vehicles.</div>;

  return (
    <div style={{ marginBottom: 24 }}>
      <h2 style={{ fontSize: 20, fontWeight: 600, marginBottom: 8 }}>Fleet Vehicles</h2>
      <ul style={{ listStyle: 'none', padding: 0 }}>
        {vehicles.map((v) => (
          <li key={v.id} style={{ marginBottom: 6 }}>
            <button
              style={{
                background: '#f5f5f5',
                border: '1px solid #ddd',
                borderRadius: 8,
                padding: '8px 16px',
                cursor: 'pointer',
                fontWeight: 500,
                fontSize: 16,
                width: '100%',
                textAlign: 'left',
              }}
              onClick={() => onSelect(v)}
            >
              {v.name || v.id} {v.licensePlate ? `(${v.licensePlate})` : ''}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
