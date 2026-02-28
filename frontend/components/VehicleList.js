

import { useEffect, useState } from 'react';


export default function VehicleList({ onSelect }) {
  const [vehicles, setVehicles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedId, setSelectedId] = useState('');
  const [search, setSearch] = useState('');


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

  // Filter vehicles by search
  const filtered = vehicles.filter(v => {
    const q = search.toLowerCase();
    return (
      (v.name && v.name.toLowerCase().includes(q)) ||
      (v.licensePlate && v.licensePlate.toLowerCase().includes(q)) ||
      (v.id && v.id.toLowerCase().includes(q))
    );
  });

  return (
    <div style={{
      minWidth: 320,
      maxWidth: 380,
      height: 'calc(100vh - 120px)',
      background: '#fff',
      borderRadius: 18,
      boxShadow: '0 4px 24px #e3e8f0',
      padding: 18,
      marginRight: 32,
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'stretch',
      position: 'sticky',
      top: 80,
      overflow: 'hidden',
    }}>
      <input
        type="text"
        placeholder="Search vehicles..."
        value={search}
        onChange={e => setSearch(e.target.value)}
        style={{
          padding: '12px 16px',
          borderRadius: 8,
          border: '1.5px solid #b3c6e0',
          fontSize: 16,
          marginBottom: 14,
          outline: 'none',
          boxShadow: '0 1px 4px #f0f4fa',
        }}
      />
      <div style={{
        flex: 1,
        overflowY: 'auto',
        borderRadius: 10,
        background: '#f7fafd',
        boxShadow: '0 1px 4px #f0f4fa',
        padding: 6,
      }}>
        {filtered.length === 0 && (
          <div style={{ color: '#888', fontStyle: 'italic', padding: 16 }}>No vehicles found.</div>
        )}
        {filtered.map((v) => (
          <div
            key={v.id}
            onClick={() => setSelectedId(v.id)}
            style={{
              padding: '13px 14px',
              marginBottom: 7,
              borderRadius: 8,
              background: v.id === selectedId ? '#e3e8f0' : '#fff',
              color: v.id === selectedId ? '#1a237e' : '#222',
              fontWeight: v.id === selectedId ? 700 : 500,
              fontSize: 16,
              cursor: 'pointer',
              border: v.id === selectedId ? '2px solid #1976d2' : '1.5px solid #b3c6e0',
              boxShadow: v.id === selectedId ? '0 2px 8px #dbeafe' : 'none',
              display: 'flex',
              alignItems: 'center',
              transition: 'all 0.15s',
            }}
          >
            <span style={{ marginRight: 10 }}>{v.name || v.id}</span>
            {v.licensePlate && <span style={{ color: '#1976d2', fontWeight: 600, fontSize: 14, marginLeft: 'auto' }}>{v.licensePlate}</span>}
          </div>
        ))}
      </div>
    </div>
  );
}
