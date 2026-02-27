import { MapContainer, TileLayer, Marker, Popup, CircleMarker } from 'react-leaflet';
import { useEffect, useState } from 'react';
import 'leaflet/dist/leaflet.css';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/heatmap';

export default function HeatMap() {
  const [clusters, setClusters] = useState([]);

  useEffect(() => {
    fetch(API_URL)
      .then((res) => res.json())
      .then(setClusters)
      .catch(console.error);
  }, []);

  return (
    <MapContainer
      center={[43.7, -79.4]}
      zoom={11}
      style={{
        height: '70vh',
        width: '100%',
        borderRadius: 20,
        boxShadow: '0 4px 32px #e0e0e0',
        background: '#fff',
        border: '1px solid #f5f5f5',
      }}
      scrollWheelZoom={true}
    >
      <TileLayer
        attribution='&copy; <a href="https://carto.com/attributions">CARTO</a>'
        url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
      />
      {clusters.map((c) => (
        <CircleMarker
          key={c.id}
          center={[c.lat, c.lng]}
          radius={8 + c.risk_score * 12}
          pathOptions={{
            color: c.risk_score > 0.7 ? '#e74c3c' : c.risk_score > 0.4 ? '#f1c40f' : '#2ecc40',
            fillColor: '#fff',
            fillOpacity: 0.85,
            weight: 3,
            opacity: 0.9,
          }}
        >
          <Popup>
            <div style={{
              minWidth: 200,
              background: '#fff',
              borderRadius: 12,
              boxShadow: '0 2px 8px #eee',
              padding: 12,
              color: '#222',
              fontFamily: 'Inter, Arial, sans-serif',
            }}>
              <div style={{ fontWeight: 700, fontSize: 18, marginBottom: 6 }}>Risk Score: <span style={{color: c.risk_score > 0.7 ? '#e74c3c' : c.risk_score > 0.4 ? '#f1c40f' : '#2ecc40'}}>{c.risk_score.toFixed(2)}</span></div>
              <div style={{ fontSize: 15, marginBottom: 4 }}><b>Avg Speed:</b> {c.avg_speed} km/h</div>
              <div style={{ fontSize: 15, marginBottom: 4 }}><b>Speed Limit:</b> {c.speed_limit} km/h</div>
              <div style={{ fontSize: 15, marginBottom: 4 }}><b>Events:</b> {c.event_count}</div>
              <div style={{ fontSize: 15, marginBottom: 4 }}><b>Hard Braking:</b> {c.exception_count}</div>
              <div style={{ fontSize: 15, marginBottom: 4 }}><b>Too Fast:</b> {c.speed_excess_count}</div>
              <div style={{ fontSize: 15 }}><b>Too Slow:</b> {c.speed_deficit_count}</div>
            </div>
          </Popup>
        </CircleMarker>
      ))}
    </MapContainer>
  );
}
