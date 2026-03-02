import { MapContainer, TileLayer, Marker, Popup, CircleMarker } from 'react-leaflet';
import { useEffect, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/heatmap';
const VEHICLE_LOCATIONS_URL = 'http://localhost:8000/api/vehicle_locations';

// Create custom vehicle marker icon
const vehicleIcon = L.icon({
  iconUrl: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" width="32" height="32"><circle cx="16" cy="16" r="14" fill="%233498db" stroke="%23fff" stroke-width="2"/><text x="16" y="20" font-size="12" font-weight="bold" fill="%23fff" text-anchor="middle">🚗</text></svg>',
  iconSize: [32, 32],
  iconAnchor: [16, 16],
  popupAnchor: [0, -16],
});

export default function HeatMap() {
  const [clusters, setClusters] = useState([]);
  const [vehicles, setVehicles] = useState([]);

  useEffect(() => {
    // Fetch heatmap clusters
    fetch(API_URL)
      .then((res) => res.json())
      .then(setClusters)
      .catch(console.error);
    
    // Fetch vehicle locations
    fetch(VEHICLE_LOCATIONS_URL)
      .then((res) => res.json())
      .then(setVehicles)
      .catch(console.error);
  }, []);

  // Group vehicles by location
  const vehiclesByLocation = vehicles.reduce((acc, v) => {
    const key = `${v.latitude.toFixed(4)},${v.longitude.toFixed(4)}`;
    if (!acc[key]) {
      acc[key] = {
        location: [v.latitude, v.longitude],
        vehicles: []
      };
    }
    acc[key].vehicles.push(v);
    return acc;
  }, {});

  const vehicleLocations = Object.values(vehiclesByLocation);

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
      {/* Vehicle Location Markers - Grouped */}
      {vehicleLocations.map((group, idx) => {
        const clusterIcon = L.icon({
          iconUrl: `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" width="40" height="40"><circle cx="16" cy="16" r="15" fill="%233498db" stroke="%23fff" stroke-width="2"/><text x="16" y="21" font-size="14" font-weight="bold" fill="%23fff" text-anchor="middle">${group.vehicles.length}</text></svg>`,
          iconSize: [40, 40],
          iconAnchor: [20, 20],
          popupAnchor: [0, -20],
        });
        
        return (
          <Marker
            key={`vehicle-group-${idx}`}
            position={group.location}
            icon={clusterIcon}
          >
            <Popup>
              <div style={{
                minWidth: 280,
                background: '#fff',
                borderRadius: 12,
                boxShadow: '0 2px 8px #eee',
                padding: 12,
                color: '#222',
                fontFamily: 'Inter, Arial, sans-serif',
                maxHeight: 400,
                overflowY: 'auto',
              }}>
                <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 12, color: '#3498db' }}>
                  🚗 {group.vehicles.length} Vehicle{group.vehicles.length > 1 ? 's' : ''} at this location
                </div>
                {group.vehicles.map((v) => (
                  <div key={v.id} style={{ 
                    marginBottom: 10, 
                    paddingBottom: 10, 
                    borderBottom: '1px solid #eee',
                    fontSize: 13,
                  }}>
                    <div style={{ fontWeight: 600, color: '#3498db', marginBottom: 4 }}>{v.name}</div>
                    <div><b>License Plate:</b> {v.licensePlate || 'N/A'}</div>
                    <div><b>Speed:</b> {v.speed !== null ? `${v.speed} km/h` : 'N/A'}</div>
                    <div style={{ fontSize: 12, color: '#666' }}>
                      {v.dateTime ? new Date(v.dateTime).toLocaleString() : 'N/A'}
                    </div>
                  </div>
                ))}
              </div>
            </Popup>
          </Marker>
        );
      })}
      
      {/* Risk Heatmap Clusters */}
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
