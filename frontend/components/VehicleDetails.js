

import { useEffect, useState, useRef } from 'react';

export default function VehicleDetails({ vehicle }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [showVin, setShowVin] = useState(false);



  // Ref to store interval id
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

  // Fetch on vehicle change and set up interval
  useEffect(() => {
    fetchVehicleData();
    // Clear any previous interval
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }
    // Set up interval to refresh every 30 seconds
    intervalRef.current = setInterval(() => {
      fetchVehicleData();
    }, 30000);
    // Cleanup on unmount or vehicle change
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
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
            {showVin ? (dashboard.vin || '-') : <span style={{ color: '#888', cursor: 'pointer' }} onClick={() => setShowVin(true)}>Show VIN</span>}
          </span>
        </li>
        <li style={{ marginBottom: 10, display: 'flex', alignItems: 'center' }}>
          <span style={{ fontWeight: 600, color: '#222', minWidth: 120 }}>Last Position:</span>
          <span style={{ marginLeft: 8 }}>
            {dashboard.lastReportedPosition && typeof dashboard.lastReportedPosition === 'object' && dashboard.lastReportedPosition.latitude !== undefined
              ? `${Number.isFinite(dashboard.lastReportedPosition.latitude) ? dashboard.lastReportedPosition.latitude.toFixed(5) : dashboard.lastReportedPosition.latitude}, ${Number.isFinite(dashboard.lastReportedPosition.longitude) ? dashboard.lastReportedPosition.longitude.toFixed(5) : dashboard.lastReportedPosition.longitude} (${dashboard.lastReportedPosition.dateTime ? dashboard.lastReportedPosition.dateTime.slice(0,19).replace('T',' ') : '-'})`
              : (typeof dashboard.lastReportedPosition === 'string' ? dashboard.lastReportedPosition : '-')}
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
          <span style={{ fontWeight: 600, color: '#222', minWidth: 120 }}>Engine Warning:</span>
          <span style={{ marginLeft: 8 }}>
            {dashboard.engineWarning && typeof dashboard.engineWarning === 'object' ? (
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <span><b>Diagnostic:</b> {dashboard.engineWarning.diagnostic && dashboard.engineWarning.diagnostic.name}</span>
                <span><b>Value:</b> {dashboard.engineWarning.data != null ? dashboard.engineWarning.data.toString() : '-'}</span>
                <span><b>Time:</b> {dashboard.engineWarning.dateTime ? dashboard.engineWarning.dateTime.replace('T',' ').slice(0,19) : '-'}</span>
              </div>
            ) : '-'}
          </span>
        </li>
        <li style={{ marginBottom: 10, display: 'flex', alignItems: 'flex-start' }}>
          <span style={{ fontWeight: 600, color: '#222', minWidth: 120 }}>Harsh Driving:</span>
          <span style={{ marginLeft: 8 }}>
            {dashboard.harshDrivingAlerts && (dashboard.harshDrivingAlerts.acceleration || dashboard.harshDrivingAlerts.braking || dashboard.harshDrivingAlerts.cornering) ? (
              <ul style={{ margin: 0, paddingLeft: 18 }}>
                {dashboard.harshDrivingAlerts.acceleration && (
                  <li><b>Acceleration:</b> {dashboard.harshDrivingAlerts.acceleration.data != null ? dashboard.harshDrivingAlerts.acceleration.data.toString() : '-'} ({dashboard.harshDrivingAlerts.acceleration.dateTime ? dashboard.harshDrivingAlerts.acceleration.dateTime.replace('T',' ').slice(0,19) : '-'})</li>
                )}
                {dashboard.harshDrivingAlerts.braking && (
                  <li><b>Braking:</b> {dashboard.harshDrivingAlerts.braking.data != null ? dashboard.harshDrivingAlerts.braking.data.toString() : '-'} ({dashboard.harshDrivingAlerts.braking.dateTime ? dashboard.harshDrivingAlerts.braking.dateTime.replace('T',' ').slice(0,19) : '-'})</li>
                )}
                {dashboard.harshDrivingAlerts.cornering && (
                  <li><b>Cornering:</b> {dashboard.harshDrivingAlerts.cornering.data != null ? dashboard.harshDrivingAlerts.cornering.data.toString() : '-'} ({dashboard.harshDrivingAlerts.cornering.dateTime ? dashboard.harshDrivingAlerts.cornering.dateTime.replace('T',' ').slice(0,19) : '-'})</li>
                )}
              </ul>
            ) : '-'}
          </span>
        </li>
        <li style={{ marginBottom: 10, display: 'flex', alignItems: 'flex-start' }}>
          <span style={{ fontWeight: 600, color: '#222', minWidth: 120 }}>Impact/Accident:</span>
          <span style={{ marginLeft: 8 }}>
            {dashboard.impactAlert && typeof dashboard.impactAlert === 'object' ? (
              <div>
                <span><b>Value:</b> {dashboard.impactAlert.data != null ? dashboard.impactAlert.data.toString() : '-'}</span><br/>
                <span><b>Time:</b> {dashboard.impactAlert.dateTime ? dashboard.impactAlert.dateTime.replace('T',' ').slice(0,19) : '-'}</span>
              </div>
            ) : '-'}
          </span>
        </li>
        <li style={{ marginBottom: 10, display: 'flex', alignItems: 'flex-start' }}>
          <span style={{ fontWeight: 600, color: '#222', minWidth: 120 }}>Maintenance:</span>
          <span style={{ marginLeft: 8 }}>
            {dashboard.maintenanceAlert && typeof dashboard.maintenanceAlert === 'object' ? (
              <div>
                <span><b>Value:</b> {dashboard.maintenanceAlert.data != null ? dashboard.maintenanceAlert.data.toString() : '-'}</span><br/>
                <span><b>Time:</b> {dashboard.maintenanceAlert.dateTime ? dashboard.maintenanceAlert.dateTime.replace('T',' ').slice(0,19) : '-'}</span>
              </div>
            ) : '-'}
          </span>
        </li>
      </ul>
      {/* Raw Device Info and Raw Status Data removed for cleaner UI */}
    </div>
  );
}
