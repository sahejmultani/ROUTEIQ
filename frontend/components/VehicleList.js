
import { useEffect, useState } from 'react';

export default function VehicleList({ onSelect }) {
  const [vehicles, setVehicles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedId, setSelectedId] = useState('');

  useEffect(() => {
    fetch('http://localhost:8000/api/vehicles')
      .then((res) => res.json())
      .then((data) => {
        setVehicles(data);
        if (data.length > 0) {
          setSelectedId(data[0].id);
          onSelect(data[0]);
        }
      })
      .catch(setError)
      .finally(() => setLoading(false));
    // eslint-disable-next-line
  }, []);

  useEffect(() => {
    if (!selectedId) return;
    const v = vehicles.find((v) => v.id === selectedId);
    if (v) onSelect(v);
    // eslint-disable-next-line
  }, [selectedId]);

  if (loading) return <div>Loading vehicles...</div>;
  if (error) return <div>Error loading vehicles.</div>;

  return (
    <div style={{
      marginBottom: 32,
      background: '#fff',
      borderRadius: 16,
      boxShadow: '0 4px 24px #e3e8f0',
      padding: 28,
      maxWidth: 420,
      marginLeft: 'auto',
      marginRight: 'auto',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
    }}>
      <label htmlFor="vehicle-select" style={{
        fontSize: 18,
        fontWeight: 700,
        marginBottom: 16,
        color: '#1a237e',
        letterSpacing: 0.2,
      }}>
        Select a Vehicle
      </label>
      <select
        id="vehicle-select"
        value={selectedId}
        onChange={e => setSelectedId(e.target.value)}
        style={{
          padding: '14px 20px',
          borderRadius: 10,
          border: '1.5px solid #b3c6e0',
          fontSize: 17,
          minWidth: 260,
          background: '#f7fafd',
          color: '#222',
          fontWeight: 500,
          outline: 'none',
          boxShadow: '0 2px 8px #f0f4fa',
          marginBottom: 4,
          transition: 'border 0.2s',
        }}
      >
        {vehicles.map((v) => (
          <option key={v.id} value={v.id}>
            {v.name || v.id} {v.licensePlate ? `(${v.licensePlate})` : ''}
          </option>
        ))}
      </select>
    </div>
  );
}
