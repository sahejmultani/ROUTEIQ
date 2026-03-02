import { MapContainer, TileLayer, Marker, Popup, CircleMarker, useMap } from 'react-leaflet';
import { useEffect, useState, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/heatmap';
const VEHICLE_LOCATIONS_URL = 'http://localhost:8000/api/vehicle_locations';
const INCIDENT_LOCATIONS_URL = 'http://localhost:8000/api/incident_locations';

// Custom vehicle marker icon
const vehicleIcon = L.icon({
  iconUrl: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" width="32" height="32"><circle cx="16" cy="16" r="14" fill="%233498db" stroke="%23fff" stroke-width="2"/><text x="16" y="20" font-size="12" font-weight="bold" fill="%23fff" text-anchor="middle">🚗</text></svg>',
  iconSize: [32, 32],
  iconAnchor: [16, 16],
  popupAnchor: [0, -16],
});

// Custom route start/end icons
const startIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-green.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

const endIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

// Fix default Leaflet icons
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
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

// Route layer component that adds polylines to existing map
function RouteLayer({ routes, selectedRoute, startCoords, endCoords }) {
  const map = useMap();
  const layersRef = useRef([]);

  useEffect(() => {
    if (!map || !routes) return;

    // Clean up previous layers
    layersRef.current.forEach(layer => {
      map.removeLayer(layer);
    });
    layersRef.current = [];

    console.log('Adding routes to heatmap');

    const fastestColor = selectedRoute === 'fastest' ? '#1976d2' : '#999';
    const safeColor = selectedRoute === 'safe' ? '#43a047' : '#999';

    // Add fastest route
    if (routes.fastestRoute?.coordinates && routes.fastestRoute.coordinates.length > 1) {
      const fastestPolyline = L.polyline(routes.fastestRoute.coordinates, {
        color: fastestColor,
        weight: selectedRoute === 'fastest' ? 5 : 2,
        opacity: selectedRoute === 'fastest' ? 1 : 0.5,
        dashArray: selectedRoute === 'fastest' ? null : '5,5'
      }).addTo(map);
      layersRef.current.push(fastestPolyline);
    }

    // Add safe route
    if (routes.safeRoute?.coordinates && routes.safeRoute.coordinates.length > 1) {
      const safePolyline = L.polyline(routes.safeRoute.coordinates, {
        color: safeColor,
        weight: selectedRoute === 'safe' ? 5 : 2,
        opacity: selectedRoute === 'safe' ? 1 : 0.5,
        dashArray: selectedRoute === 'safe' ? null : '5,5'
      }).addTo(map);
      layersRef.current.push(safePolyline);
    }

    // Add start marker
    if (startCoords) {
      const startMarker = L.marker([startCoords.latitude, startCoords.longitude], { icon: startIcon })
        .bindPopup(`<strong>Start</strong><br />${startCoords.display_name || startCoords.latitude.toFixed(4) + ', ' + startCoords.longitude.toFixed(4)}`)
        .addTo(map);
      layersRef.current.push(startMarker);
    }

    // Add end marker
    if (endCoords) {
      const endMarker = L.marker([endCoords.latitude, endCoords.longitude], { icon: endIcon })
        .bindPopup(`<strong>End</strong><br />${endCoords.display_name || endCoords.latitude.toFixed(4) + ', ' + endCoords.longitude.toFixed(4)}`)
        .addTo(map);
      layersRef.current.push(endMarker);
    }

    return () => {
      // Cleanup on unmount
      layersRef.current.forEach(layer => {
        map.removeLayer(layer);
      });
      layersRef.current = [];
    };
  }, [map, routes, selectedRoute, startCoords, endCoords]);

  return null;
}

export default function CombinedHeatmapRoute({ routes, selectedRoute, startCoords, endCoords }) {
  const [vehicles, setVehicles] = useState([]);
  const [incidents, setIncidents] = useState([]);
  const [center, setCenter] = useState([43.66, -79.40]);
  const [zoom, setZoom] = useState(11);

  useEffect(() => {
    // Fetch vehicle locations
    fetch(VEHICLE_LOCATIONS_URL)
      .then((res) => res.json())
      .then(setVehicles)
      .catch((err) => {
        console.error('Error fetching vehicle locations:', err);
        setVehicles([]);
      });

    // Fetch incident locations
    fetch(INCIDENT_LOCATIONS_URL)
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
        return res.json();
      })
      .then((data) => {
        console.log('Incident locations API response:', data);
        const incidentList = data.incidents || [];
        console.log('Setting incidents:', incidentList.length);
        setIncidents(incidentList);
      })
      .catch((err) => {
        console.error('Error fetching incident locations:', err);
        setIncidents([]);
      });
  }, []);

  // Auto-fit map to show route when available
  useEffect(() => {
    if (routes && startCoords && endCoords) {
      const lat1 = startCoords.latitude;
      const lng1 = startCoords.longitude;
      const lat2 = endCoords.latitude;
      const lng2 = endCoords.longitude;

      const centerLat = (lat1 + lat2) / 2;
      const centerLng = (lng1 + lng2) / 2;
      setCenter([centerLat, centerLng]);

      const distance = Math.sqrt(Math.pow(lat2 - lat1, 2) + Math.pow(lng2 - lng1, 2));
      const computedZoom = Math.max(10, 14 - Math.floor(distance * 8));
      setZoom(computedZoom);
    }
  }, [routes, startCoords, endCoords]);

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
      center={center}
      zoom={zoom}
      style={{ width: '100%', height: '600px' }}
      scrollWheelZoom={true}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />

      {/* Heatmap Circles - Always Visible */}
      {incidents && incidents.length > 0 ? (
        incidents.map((incident, idx) => {
          // Get primary incident type from cluster
          const primaryType = Object.entries(incident.incidents || {}).sort((a, b) => b[1] - a[1])[0];
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
                    <div style={{ fontWeight: 600, marginBottom: 8, color: '#666' }}>
                      Total Incidents: {incident.total_incidents}
                    </div>
                    <div style={{ 
                      display: 'grid', 
                      gridTemplateColumns: '1fr 1fr',
                      gap: '8px'
                    }}>
                      {Object.entries(incident.incidents || {}).sort((a, b) => b[1] - a[1]).map(([type, count]) => (
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
        })
      ) : (
        <div style={{ 
          position: 'absolute', 
          top: '10px', 
          left: '10px', 
          background: '#fff3cd', 
          padding: '10px 15px', 
          borderRadius: '4px', 
          zIndex: 401,
          fontSize: '12px',
          fontFamily: 'Inter, Arial, sans-serif'
        }}>
          Loading incidents...
        </div>
      )}

      {/* Vehicle Locations - Grouped by Location */}
      {vehicleLocations.map((group, idx) => {
        // If single vehicle, use car icon; if multiple, use numbered cluster icon
        const icon = group.vehicles.length === 1 ? vehicleIcon : L.icon({
          iconUrl: `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" width="40" height="40"><circle cx="16" cy="16" r="15" fill="%233498db" stroke="%23fff" stroke-width="2"/><text x="16" y="21" font-size="14" font-weight="bold" fill="%23fff" text-anchor="middle">${group.vehicles.length}</text></svg>`,
          iconSize: [40, 40],
          iconAnchor: [20, 20],
          popupAnchor: [0, -20],
        });

        return (
          <Marker
            key={`vehicle-group-${idx}`}
            position={group.location}
            icon={icon}
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

      {/* Routes - Only when available */}
      {routes && selectedRoute && startCoords && endCoords && (
        <RouteLayer
          routes={routes}
          selectedRoute={selectedRoute}
          startCoords={startCoords}
          endCoords={endCoords}
        />
      )}

      {/* Legend */}
      <div style={{
        position: 'absolute',
        bottom: '20px',
        right: '20px',
        background: 'white',
        padding: '12px 18px',
        borderRadius: '6px',
        boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
        fontSize: '12px',
        zIndex: 400,
        maxWidth: '200px',
      }}>
        <div style={{ fontWeight: 'bold', marginBottom: '8px' }}>Incidents</div>
        <div style={{ marginBottom: '4px' }}>⚡ Aggressive Speeding</div>
        <div style={{ marginBottom: '4px' }}>🛑 Harsh Braking</div>
        <div style={{ marginBottom: '4px' }}>📈 Rapid Acceleration</div>
        <div style={{ marginBottom: '4px' }}>🔄 Sharp Turn</div>
        <div style={{ marginBottom: '8px' }}>🐢 Slow Driving</div>
        {routes && (
          <>
            <div style={{ borderTop: '1px solid #ddd', paddingTop: '8px', fontWeight: 'bold', marginBottom: '8px' }}>Routes</div>
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              <div style={{ width: '12px', height: '2px', backgroundColor: '#1976d2' }} />
              <span>Fastest</span>
            </div>
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              <div style={{ width: '12px', height: '2px', backgroundColor: '#43a047', backgroundImage: 'repeating-linear-gradient(90deg, #43a047 0, #43a047 2px, transparent 2px, transparent 4px)' }} />
              <span>Safe</span>
            </div>
          </>
        )}
      </div>
    </MapContainer>
  );
}
