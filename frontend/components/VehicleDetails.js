

import { useEffect, useState, useRef } from 'react';

export default function VehicleDetails({ vehicle }) {
  // All hooks at the top, before any return
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [showVin, setShowVin] = useState(false);
  const [lastPositionAddress, setLastPositionAddress] = useState(null);
  const intervalRef = useRef(null);

  // Function to fetch vehicle data
  const fetchVehicleData = () => {
    if (!vehicle) return;
    setLoading(true);
    setError(null);
    fetch(`http://localhost:8000/api/vehicle/${vehicle.id}`)
      .then((res) => res.json())
      .then(setData)
      .catch(setError)
      .finally(() => setLoading(false));
  };

  // Fetch only when vehicle changes
  useEffect(() => {
    fetchVehicleData();
    // Cleanup: clear any previous interval (if any)
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }
    // No interval set
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [vehicle]);

  const dashboard = data && data.dashboard ? data.dashboard : {};

  // Reverse geocode last position when it changes
  useEffect(() => {
    const pos = dashboard.lastReportedPosition;
    if (pos && typeof pos === 'object' && pos.latitude != null && pos.longitude != null) {
      const lat = pos.latitude;
      const lng = pos.longitude;
      // Use Nominatim OpenStreetMap API for reverse geocoding
      fetch(`https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}`)
        .then(res => res.json())
        .then(json => {
          setLastPositionAddress(json.display_name || null);
        })
        .catch(() => setLastPositionAddress(null));
    } else {
      setLastPositionAddress(null);
    }
  }, [dashboard.lastReportedPosition]);

  // Early returns after all hooks
  if (!vehicle) return null;
  if (loading) {
    return (
      <div style={{
        position: 'fixed',
        top: 80,
        right: 0,
        width: 400,
        maxWidth: '97vw',
        height: 'calc(100vh - 100px)',
        background: 'rgba(255,255,255,0.97)',
        borderTopLeftRadius: 20,
        borderBottomLeftRadius: 20,
        boxShadow: '-2px 0 12px #e3e8f0',
        padding: 28,
        zIndex: 200,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        fontFamily: 'Poppins, Inter, Arial, sans-serif',
      }}>
        <div style={{ width: '80%', margin: '0 auto', marginBottom: 18 }}>
          <div style={{ height: 6, width: '100%', background: '#e3e8f0', borderRadius: 6, overflow: 'hidden' }}>
            <div style={{ width: '100%', height: '100%', background: 'linear-gradient(90deg, #43a047 30%, #e3e8f0 100%)', animation: 'loadingBar 1.2s linear infinite' }} />
          </div>
        </div>
        <span style={{ color: '#888', fontSize: 17, fontWeight: 500 }}>Loading vehicle info...</span>
        <style>{`
          @keyframes loadingBar {
            0% { transform: translateX(-100%); }
            100% { transform: translateX(100%); }
          }
        `}</style>
      </div>
    );
  }
  if (error) return null;
  if (!data) return null;
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
      width: 400,
      maxWidth: '97vw',
      height: 'calc(100vh - 100px)',
      background: 'rgba(255,255,255,0.97)',
      borderTopLeftRadius: 20,
      borderBottomLeftRadius: 20,
      boxShadow: '-2px 0 12px #e3e8f0',
      padding: 28,
      zIndex: 200,
      overflowY: 'auto',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'flex-start',
      animation: 'slideInDrawer 0.3s',
      border: '1px solid #e3e8f0',
      fontFamily: 'Poppins, Inter, Arial, sans-serif',
    }}>
      <h3 style={{ fontSize: 22, fontWeight: 700, marginBottom: 16, color: '#222', letterSpacing: 0.1, fontFamily: 'Poppins, Inter, Arial, sans-serif' }}>Vehicle Details</h3>
      <div style={{ fontWeight: 600, color: '#888', marginBottom: 8, fontSize: 15, letterSpacing: 0.1 }}>Summary</div>
      <ul style={{
        background: '#f7f8fa',
        borderRadius: 12,
        padding: 16,
        fontSize: 15.5,
        margin: 0,
        marginBottom: 16,
        boxShadow: '0 1px 4px #e3e8f0',
        width: '100%',
        fontFamily: 'Poppins, Inter, Arial, sans-serif',
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
            {showVin ? (
              <>
                {dashboard.vin || '-'}{' '}
                <button
                  style={{ marginLeft: 8, fontSize: 13, padding: '2px 8px', borderRadius: 6, border: '1px solid #ccc', background: '#f7f8fa', cursor: 'pointer' }}
                  onClick={() => setShowVin(false)}
                >Hide VIN</button>
              </>
            ) : (
              <span style={{ color: '#888', cursor: 'pointer' }} onClick={() => setShowVin(true)}>Show VIN</span>
            )}
          </span>
        </li>
        <li style={{ marginBottom: 10, display: 'flex', alignItems: 'flex-start' }}>
          <span style={{ fontWeight: 600, color: '#222', minWidth: 120 }}>Last Position:</span>
          <span style={{ marginLeft: 8, display: 'flex', flexDirection: 'column' }}>
            {dashboard.lastReportedPosition && typeof dashboard.lastReportedPosition === 'object' && dashboard.lastReportedPosition.latitude !== undefined ? (
              <>
                <span>
                  {Number.isFinite(dashboard.lastReportedPosition.latitude) ? dashboard.lastReportedPosition.latitude.toFixed(5) : dashboard.lastReportedPosition.latitude}, {Number.isFinite(dashboard.lastReportedPosition.longitude) ? dashboard.lastReportedPosition.longitude.toFixed(5) : dashboard.lastReportedPosition.longitude} ({dashboard.lastReportedPosition.dateTime ? dashboard.lastReportedPosition.dateTime.slice(0,19).replace('T',' ') : '-'})
                </span>
                <span style={{ color: '#888', fontSize: 14, marginTop: 2 }}>
                  {lastPositionAddress ? lastPositionAddress : 'Looking up address...'}
                </span>
              </>
            ) : (typeof dashboard.lastReportedPosition === 'string' ? dashboard.lastReportedPosition : '-')}
          </span>
        </li>
        <li style={{ marginBottom: 10, display: 'flex', alignItems: 'center' }}>
          <span style={{ fontWeight: 600, color: '#222', minWidth: 120 }}>Speed:</span>
          <span style={{ marginLeft: 8 }}>
            {dashboard.speed && typeof dashboard.speed.value === 'number'
              ? `${dashboard.speed.value} km/h`
              : (dashboard.speed && typeof dashboard.speed.value === 'string' ? dashboard.speed.value : '-')}
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
        <li style={{ marginBottom: 10, display: 'flex', alignItems: 'flex-start' }}>
          <span style={{ fontWeight: 600, color: '#222', minWidth: 120 }}>Recent Violations:</span>
          <span style={{ marginLeft: 8 }}>
            {dashboard.recentViolations && dashboard.recentViolations.length > 0 ? (
              <ul style={{ margin: 0, paddingLeft: 18 }}>
                {dashboard.recentViolations.map((v, i) => (
                  <li key={i}><b>{v.type}</b> ({v.severity}) - {v.activeTime ? v.activeTime.replace('T',' ').slice(0,16) : '-'}</li>
                ))}
              </ul>
            ) : 'No violations recorded'}
          </span>
        </li>
        <li style={{ marginBottom: 10, display: 'flex', alignItems: 'flex-start' }}>
          <span style={{ fontWeight: 600, color: '#222', minWidth: 120 }}>Driving Summary:</span>
          <span style={{ marginLeft: 8 }}>
            {dashboard.tripSummary ? (
              <div>
                <span><b>Distance:</b> {dashboard.tripSummary.distance || 0} km</span><br/>
                <span><b>Driving Time:</b> {dashboard.tripSummary.drivingDuration || '-'}</span><br/>
                <span><b>Idle Time:</b> {dashboard.tripSummary.idlingDuration || '-'}</span><br/>
                <span><b>Avg Speed:</b> {dashboard.tripSummary.avgSpeed || '-'} km/h</span>
              </div>
            ) : 'No trip data available'}
          </span>
        </li>
        <li style={{ marginBottom: 10, display: 'flex', alignItems: 'flex-start' }}>
          <span style={{ fontWeight: 600, color: '#222', minWidth: 120 }}>Maintenance Due:</span>
          <span style={{ marginLeft: 8 }}>
            {dashboard.maintenanceItems && dashboard.maintenanceItems.length > 0 ? (
              <ul style={{ margin: 0, paddingLeft: 18 }}>
                {dashboard.maintenanceItems.map((m, i) => (
                  <li key={i}><b>{m.diagnostic}</b> ({m.days} days, {m.kilometers} km)</li>
                ))}
              </ul>
            ) : 'No maintenance items due'}
          </span>
        </li>
      </ul>
      {/* Raw Device Info and Raw Status Data removed for cleaner UI */}
    </div>
  );
}
