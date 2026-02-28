

import { useEffect, useState } from 'react';

export default function VehicleDetails({ vehicle }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [showVin, setShowVin] = useState(false);


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
  if (loading) return null;
  if (error) return null;
  if (!data) return null;

  const dashboard = data.dashboard || {};
  // Helper for status dot
  const StatusDot = ({ active }) => (
    <span style={{
      display: 'inline-block',
      width: 12,
      height: 12,
      borderRadius: '50%',
      marginRight: 8,
      background: active ? '#43a047' : '#e53935',
      border: '1.5px solid #fff',
      boxShadow: '0 0 2px #888',
      verticalAlign: 'middle',
    }} />
  );

  return (
    <div style={{
      position: 'fixed',
      top: 80,
      right: 0,
      width: 420,
      maxWidth: '95vw',
      height: 'calc(100vh - 100px)',
      background: '#fff',
      borderTopLeftRadius: 24,
      borderBottomLeftRadius: 24,
      boxShadow: '-4px 0 32px #e3e8f0',
      padding: 32,
      zIndex: 200,
      overflowY: 'auto',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'flex-start',
      animation: 'slideInDrawer 0.3s',
    }}>
      <h3 style={{ fontSize: 22, fontWeight: 700, marginBottom: 18, color: '#1a237e', letterSpacing: 0.2 }}>Vehicle Details</h3>
      <div style={{ fontWeight: 600, color: '#1976d2', marginBottom: 8, fontSize: 16 }}>Summary</div>
      <ul style={{
        background: '#f7fafd',
        borderRadius: 10,
        padding: 18,
        fontSize: 15.5,
        margin: 0,
        marginBottom: 18,
        boxShadow: '0 2px 8px #f0f4fa',
        width: '100%',
      }}>
        <li style={{ marginBottom: 10, display: 'flex', alignItems: 'center' }}>
          <StatusDot active={dashboard.activeStatus} />
          <span style={{ fontWeight: 600, color: '#222', minWidth: 120 }}>Vehicle:</span>
          <span style={{ marginLeft: 8 }}>{dashboard.vehicleName || '-'}</span>
        </li>
        <li style={{ marginBottom: 10, display: 'flex', alignItems: 'center' }}>
          <span style={{ fontWeight: 600, color: '#222', minWidth: 120 }}>License Plate:</span>
          <span style={{ marginLeft: 8 }}>{dashboard.licensePlate || '-'}</span>
        </li>
        <li style={{ marginBottom: 10, display: 'flex', alignItems: 'center' }}>
          <span style={{ fontWeight: 600, color: '#222', minWidth: 120 }}>VIN:</span>
          <span style={{ marginLeft: 8 }}>
            {showVin ? (dashboard.vin || '-') : <span style={{ color: '#888', cursor: 'pointer' }} onClick={() => setShowVin(true)}>Show VIN</span>}
          </span>
        </li>
        <li style={{ marginBottom: 10, display: 'flex', alignItems: 'center' }}>
          <span style={{ fontWeight: 600, color: '#222', minWidth: 120 }}>Last Position:</span>
          <span style={{ marginLeft: 8 }}>
            {dashboard.lastReportedPosition && dashboard.lastReportedPosition.latitude ?
              `${dashboard.lastReportedPosition.latitude.toFixed(5)}, ${dashboard.lastReportedPosition.longitude.toFixed(5)} (${dashboard.lastReportedPosition.dateTime?.slice(0,19).replace('T',' ')})`
              : '-'}
          </span>
        </li>
        <li style={{ marginBottom: 10, display: 'flex', alignItems: 'center' }}>
          <span style={{ fontWeight: 600, color: '#222', minWidth: 120 }}>Speed:</span>
          <span style={{ marginLeft: 8 }}>
            {dashboard.speed && dashboard.speed.value != null ? `${dashboard.speed.value} km/h` : '-'}
            {dashboard.speedingAlert && <span style={{ color: '#e53935', fontWeight: 700, marginLeft: 10 }}>⚠️ Speeding!</span>}
          </span>
        </li>
        <li style={{ marginBottom: 10, display: 'flex', alignItems: 'center' }}>
          <span style={{ fontWeight: 600, color: '#222', minWidth: 120 }}>Fuel Status:</span>
          <span style={{ marginLeft: 8 }}>{dashboard.fuelStatus != null ? `${dashboard.fuelStatus}%` : '-'}</span>
        </li>
        <li style={{ marginBottom: 10, display: 'flex', alignItems: 'center' }}>
          <span style={{ fontWeight: 600, color: '#222', minWidth: 120 }}>Seatbelt:</span>
          <span style={{ marginLeft: 8 }}>
            {dashboard.seatbeltStatus == null ? '-' : dashboard.seatbeltStatus ? 'On' : 'Off'}
            {dashboard.seatbeltWarning && <span style={{ color: '#e53935', fontWeight: 700, marginLeft: 10 }}>⚠️ Seatbelt!</span>}
          </span>
        </li>
        <li style={{ marginBottom: 10, display: 'flex', alignItems: 'center' }}>
          <span style={{ fontWeight: 600, color: '#222', minWidth: 120 }}>Engine Warning:</span>
          <span style={{ marginLeft: 8 }}>{dashboard.engineWarning ? <span style={{ color: '#e53935', fontWeight: 700 }}>⚠️</span> : '-'}</span>
        </li>
        <li style={{ marginBottom: 10, display: 'flex', alignItems: 'center' }}>
          <span style={{ fontWeight: 600, color: '#222', minWidth: 120 }}>Harsh Driving:</span>
          <span style={{ marginLeft: 8 }}>
            {dashboard.harshDrivingAlerts && (dashboard.harshDrivingAlerts.acceleration || dashboard.harshDrivingAlerts.braking || dashboard.harshDrivingAlerts.cornering) ?
              <span style={{ color: '#e53935', fontWeight: 700 }}>⚠️</span> : '-'}
          </span>
        </li>
        <li style={{ marginBottom: 10, display: 'flex', alignItems: 'center' }}>
          <span style={{ fontWeight: 600, color: '#222', minWidth: 120 }}>Impact/Accident:</span>
          <span style={{ marginLeft: 8 }}>{dashboard.impactAlert ? <span style={{ color: '#e53935', fontWeight: 700 }}>⚠️</span> : '-'}</span>
        </li>
        <li style={{ marginBottom: 10, display: 'flex', alignItems: 'center' }}>
          <span style={{ fontWeight: 600, color: '#222', minWidth: 120 }}>Maintenance:</span>
          <span style={{ marginLeft: 8 }}>{dashboard.maintenanceAlert ? <span style={{ color: '#e53935', fontWeight: 700 }}>⚠️</span> : '-'}</span>
        </li>
      </ul>
      {/* Optionally, show raw device/statusData for debugging */}
      <div style={{ fontWeight: 600, color: '#1976d2', marginBottom: 8, fontSize: 16 }}>Raw Device Info</div>
      <ul style={{
        background: '#f7fafd',
        borderRadius: 10,
        padding: 12,
        fontSize: 13.5,
        maxHeight: 120,
        overflow: 'auto',
        margin: 0,
        boxShadow: '0 2px 8px #f0f4fa',
        width: '100%',
        marginBottom: 12,
      }}>
        {Object.entries(data.device || {}).map(([field, value]) => (
          <li key={field} style={{ marginBottom: 5, listStyle: 'none', display: 'flex', alignItems: 'center' }}>
            <span style={{ color: '#1a237e', fontWeight: 600, minWidth: 90 }}>{field}:</span>
            <span style={{ marginLeft: 8, color: '#333', wordBreak: 'break-all' }}>{typeof value === 'object' ? JSON.stringify(value) : String(value)}</span>
          </li>
        ))}
      </ul>
      <div style={{ fontWeight: 600, color: '#1976d2', marginBottom: 8, fontSize: 16 }}>Raw Status Data</div>
      {Array.isArray(data.statusData) && data.statusData.length > 0 ? (
        <ul style={{
          background: '#f7fafd',
          borderRadius: 10,
          padding: 12,
          fontSize: 13.5,
          maxHeight: 120,
          overflow: 'auto',
          margin: 0,
          boxShadow: '0 2px 8px #f0f4fa',
          width: '100%',
        }}>
          {Object.entries(data.statusData[0]).map(([field, value]) => (
            <li key={field} style={{ marginBottom: 5, listStyle: 'none', display: 'flex', alignItems: 'center' }}>
              <span style={{ color: '#1a237e', fontWeight: 600, minWidth: 90 }}>{field}:</span>
              <span style={{ marginLeft: 8, color: '#333', wordBreak: 'break-all' }}>{typeof value === 'object' ? JSON.stringify(value) : String(value)}</span>
            </li>
          ))}
        </ul>
      ) : (
        <div style={{ color: '#888', fontStyle: 'italic' }}>No status data available.</div>
      )}
    </div>
  );
}
