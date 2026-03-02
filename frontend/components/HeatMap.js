import { MapContainer, TileLayer, Marker, Popup, CircleMarker } from 'react-leaflet';
import { useEffect, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/heatmap';
const VEHICLE_LOCATIONS_URL = 'http://localhost:8000/api/vehicle_locations';
const INCIDENT_LOCATIONS_URL = 'http://localhost:8000/api/incident_locations';

// Create custom vehicle marker icon
const vehicleIcon = L.icon({
  iconUrl: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" width="32" height="32"><circle cx="16" cy="16" r="14" fill="%233498db" stroke="%23fff" stroke-width="2"/><text x="16" y="20" font-size="12" font-weight="bold" fill="%23fff" text-anchor="middle">🚗</text></svg>',
  iconSize: [32, 32],
  iconAnchor: [16, 16],
  popupAnchor: [0, -16],
});

// Get color for incident type
const getIncidentColor = (type) => {
  switch(type) {
    case 'Aggressive Speeding': return '#c0392b';
    case 'Harsh Braking': return '#e74c3c';
    case 'Rapid Acceleration': return '#f39c12';
    case 'Sharp Turn': return '#e67e22';
    case 'Slow Driving': return '#9b59b6';
    default: return '#95a5a6';
  }
};

// Get emoji for incident type
const getIncidentEmoji = (type) => {
  switch(type) {
    case 'Aggressive Speeding': return '⚡';
    case 'Harsh Braking': return '🛑';
    case 'Rapid Acceleration': return '📈';
    case 'Sharp Turn': return '🔄';
    case 'Slow Driving': return '🐢';
    default: return '⚠️';
  }
};

export default function HeatMap() {
  const [vehicles, setVehicles] = useState([]);
  const [incidents, setIncidents] = useState([]);

  useEffect(() => {
    // Fetch vehicle locations
    fetch(VEHICLE_LOCATIONS_URL)
      .then((res) => res.json())
      .then(setVehicles)
      .catch(console.error);
    
    // Fetch incident locations
    fetch(INCIDENT_LOCATIONS_URL)
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
        return res.json();
      })
      .then((data) => {
        console.log('Incident locations fetched:', data.incidents ? data.incidents.length : 0);
        setIncidents(data.incidents || []);
      })
      .catch((error) => {
        console.error('Failed to fetch incident locations:', error);
      });
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
      
      {/* Incident Location Markers - Using CircleMarker for better compatibility */}
      {incidents && incidents.length > 0 && incidents.map((incident, idx) => {
        // Get primary incident type
        const primaryType = Object.entries(incident.incidents).sort((a, b) => b[1] - a[1])[0];
        const primaryTypeLabel = primaryType ? primaryType[0] : 'Unknown';
        const color = getIncidentColor(primaryTypeLabel);
        
        return (
          <CircleMarker
            key={`incident-${idx}`}
            center={[incident.latitude, incident.longitude]}
            radius={12}
            pathOptions={{
              color: color,
              fillColor: color,
              fillOpacity: 0.8,
              weight: 3,
              opacity: 1,
            }}
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
              }}>
                <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 12, color: color }}>
                  📍 {primaryTypeLabel}
                </div>
                <div style={{ marginBottom: 12, fontSize: 13 }}>
                  <div style={{ fontWeight: 600, marginBottom: 8, color: '#666' }}>Total Incidents: {incident.total_incidents}</div>
                  <div style={{ 
                    display: 'grid', 
                    gridTemplateColumns: '1fr 1fr',
                    gap: '8px'
                  }}>
                    {Object.entries(incident.incidents).sort((a, b) => b[1] - a[1]).map(([type, count]) => (
                      <div key={type} style={{
                        background: getIncidentColor(type),
                        color: '#fff',
                        padding: '6px 8px',
                        borderRadius: '6px',
                        fontSize: '12px',
                        fontWeight: 600,
                        textAlign: 'center'
                      }}>
                        <div>{getIncidentEmoji(type)} {type}</div>
                        <div style={{ fontSize: '11px', marginTop: '2px' }}>{count} incident{count > 1 ? 's' : ''}</div>
                      </div>
                    ))}
                  </div>
                </div>
                <div style={{ fontSize: 11, color: '#666', marginTop: 8 }}>
                  Lat: {incident.latitude.toFixed(4)}, Lng: {incident.longitude.toFixed(4)}
                </div>
              </div>
            </Popup>
          </CircleMarker>
        );
      })}
    </MapContainer>
  );}