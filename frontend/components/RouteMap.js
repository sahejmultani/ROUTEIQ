import React, { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix default icon issue with Leaflet
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// Custom icons
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

// Content component that renders inside MapContainer
function MapContent({ routes, selectedRoute, startCoords, endCoords, fastestColor, safeColor }) {
  const map = useMap();

  useEffect(() => {
    if (!map || !routes) return;
    
    console.log('Map available, adding routes');

    // Add routes using Leaflet API directly
    if (routes.fastestRoute?.coordinates && routes.fastestRoute.coordinates.length > 1) {
      const fastestPolyline = L.polyline(routes.fastestRoute.coordinates, {
        color: fastestColor,
        weight: selectedRoute === 'fastest' ? 5 : 2,
        opacity: selectedRoute === 'fastest' ? 1 : 0.5,
        dashArray: selectedRoute === 'fastest' ? null : '5,5'
      }).addTo(map);
      console.log('Added fastest route');
    }

    if (routes.safeRoute?.coordinates && routes.safeRoute.coordinates.length > 1) {
      const safePolyline = L.polyline(routes.safeRoute.coordinates, {
        color: safeColor,
        weight: selectedRoute === 'safe' ? 5 : 2,
        opacity: selectedRoute === 'safe' ? 1 : 0.5,
        dashArray: selectedRoute === 'safe' ? null : '5,5'
      }).addTo(map);
      console.log('Added safe route');
    }
  }, [map, routes, selectedRoute, fastestColor, safeColor]);

  return (
    <>
      {/* Start Marker */}
      <Marker position={[startCoords.latitude, startCoords.longitude]} icon={startIcon}>
        <Popup>
          <strong>Start</strong>
          <br />
          {startCoords.display_name || `${startCoords.latitude.toFixed(4)}, ${startCoords.longitude.toFixed(4)}`}
        </Popup>
      </Marker>

      {/* End Marker */}
      <Marker position={[endCoords.latitude, endCoords.longitude]} icon={endIcon}>
        <Popup>
          <strong>End</strong>
          <br />
          {endCoords.display_name || `${endCoords.latitude.toFixed(4)}, ${endCoords.longitude.toFixed(4)}`}
        </Popup>
      </Marker>
    </>
  );
}

export default function RouteMap({ startCoords, endCoords, selectedRoute, routes }) {
  const [center, setCenter] = useState([43.66, -79.40]);
  const [zoom, setZoom] = useState(12);

  useEffect(() => {
    if (startCoords && endCoords) {
      const lat1 = startCoords.latitude;
      const lng1 = startCoords.longitude;
      const lat2 = endCoords.latitude;
      const lng2 = endCoords.longitude;

      const centerLat = (lat1 + lat2) / 2;
      const centerLng = (lng1 + lng2) / 2;
      setCenter([centerLat, centerLng]);

      const distance = Math.sqrt(Math.pow(lat2 - lat1, 2) + Math.pow(lng2 - lng1, 2));
      const zoom = Math.max(10, 14 - Math.floor(distance * 8));
      setZoom(zoom);
      
      console.log('RouteMap: Center and zoom updated', { center: [centerLat, centerLng], zoom });
    }
  }, [startCoords, endCoords]);

  if (!startCoords || !endCoords || !routes) {
    return <div style={{ textAlign: 'center', padding: '20px', color: '#999' }}>Loading map...</div>;
  }

  const fastestColor = selectedRoute === 'fastest' ? '#1976d2' : '#999';
  const safeColor = selectedRoute === 'safe' ? '#43a047' : '#999';

  return (
    <div style={{ width: '100%', position: 'relative', borderRadius: '8px', overflow: 'hidden', border: '1px solid #ddd' }}>
      <MapContainer
        center={center}
        zoom={zoom}
        style={{ width: '100%', height: '500px' }}
        scrollWheelZoom={true}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        <MapContent 
          routes={routes}
          selectedRoute={selectedRoute}
          startCoords={startCoords}
          endCoords={endCoords}
          fastestColor={fastestColor}
          safeColor={safeColor}
        />
      </MapContainer>

      {/* Legend */}
      <div style={{
        position: 'absolute',
        bottom: '20px',
        right: '20px',
        background: 'white',
        padding: '12px 18px',
        borderRadius: '6px',
        boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
        fontSize: '13px',
        zIndex: 400,
      }}>
        <div style={{ marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div style={{ width: '12px', height: '4px', backgroundColor: '#1976d2' }} />
          <span>Fastest Route</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div style={{ width: '12px', height: '4px', backgroundColor: '#43a047', backgroundImage: 'repeating-linear-gradient(90deg, #43a047 0, #43a047 2px, transparent 2px, transparent 4px)' }} />
          <span>Safest Route</span>
        </div>
      </div>
    </div>
  );
}
