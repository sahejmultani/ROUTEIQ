import { useEffect, useState } from 'react';
import Link from 'next/link';

const getIntersectionFromCoordinates = async (lat, lng, cache = {}) => {
  const key = `${lat.toFixed(4)},${lng.toFixed(4)}`;
  if (cache[key]) {
    return cache[key];
  }

  try {
    const response = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18`
    );
    const data = await response.json();
    const address = data.address || {};
    
    // Try to construct intersection
    let intersection = null;
    
    // Check for explicit road intersection
    if (address.road) {
      // Look for nearby features that could indicate an intersection
      if (address.neighbourhood) {
        intersection = `${address.road} & ${address.neighbourhood}`;
      } else if (address.suburb) {
        intersection = `${address.road} area`;
      } else {
        intersection = address.road;
      }
    } else if (address.street) {
      intersection = address.street;
    } else if (address.city) {
      intersection = address.city;
    } else {
      intersection = `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
    }
    
    cache[key] = intersection;
    return intersection;
  } catch (error) {
    return `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
  }
};

export default function RiskAnalysis() {
  const [data, setData] = useState(null);
  const [vehicles, setVehicles] = useState([]);
  const [selectedVehicle, setSelectedVehicle] = useState('');
  const [loading, setLoading] = useState(true);
  const [timePeriod, setTimePeriod] = useState(72);
  const [addressCache, setAddressCache] = useState({});
  const [alertAddresses, setAlertAddresses] = useState({});

  // Fetch available vehicles on mount
  useEffect(() => {
    const fetchVehicles = async () => {
      try {
        const response = await fetch('http://localhost:8000/api/vehicles');
        const result = await response.json();
        // API returns array directly, not wrapped in object
        const vehicleList = Array.isArray(result) ? result : result.vehicles || [];
        if (vehicleList.length > 0) {
          setVehicles(vehicleList);
          // Auto-select first vehicle
          setSelectedVehicle(vehicleList[0].id);
        }
      } catch (error) {
        console.error('Failed to fetch vehicles:', error);
      }
    };
    fetchVehicles();
  }, []);

  const fetchAnalysis = async (hours, vehicleId = null) => {
    setLoading(true);
    try {
      let url = `http://localhost:8000/api/advanced_risk_analysis?time_period_hours=${hours}`;
      if (vehicleId) {
        url += `&vehicle_id=${vehicleId}`;
      }
      
      const response = await fetch(url);
      const result = await response.json();
      setData(result);

      // Fetch intersections for alerts
      if (result.alerts) {
        const newAlertAddresses = {};
        for (let i = 0; i < Math.min(result.alerts.length, 30); i++) {
          const alert = result.alerts[i];
          if (alert.location) {
            const addr = await getIntersectionFromCoordinates(alert.location.latitude, alert.location.longitude, addressCache);
            newAlertAddresses[i] = addr;
          }
        }
        setAlertAddresses(newAlertAddresses);
      }
    } catch (error) {
      console.error('Failed to fetch analysis:', error);
    } finally {
      setLoading(false);
    }
  };

  // Fetch analysis when vehicle selection changes
  useEffect(() => {
    if (selectedVehicle) {
      fetchAnalysis(timePeriod, selectedVehicle);
    }
  }, [selectedVehicle]);

  const handleRefresh = () => {
    fetchAnalysis(timePeriod, selectedVehicle);
  };

  const getSeverityColor = (severity, alertType) => {
    // Color-code by alert type
    if (alertType === 'Aggressive Speeding' || alertType === 'Harsh Braking') return '#c0392b';
    if (alertType === 'Slow Driving' || alertType === 'Rapid Acceleration') return '#e74c3c';
    if (alertType === 'Sharp Turn') return '#e67e22';
    if (severity > 0.7) return '#e74c3c';
    if (severity > 0.4) return '#f39c12';
    return '#27ae60';
  };

  const getAlertIcon = (alertType) => {
    switch(alertType) {
      case 'Aggressive Speeding': return '⚡';
      case 'Harsh Braking': return '🛑';
      case 'Rapid Acceleration': return '📈';
      case 'Slow Driving': return '🐢';
      case 'Sharp Turn': return '🔄';
      default: return '⚠️';
    }
  };

  return (
    <div style={{ padding: '20px', fontFamily: 'Inter, Arial, sans-serif', background: '#f8f9fa', minHeight: '100vh' }}>
      {/* Header */}
      <div style={{ marginBottom: '30px' }}>
        <Link href="/fleet" legacyBehavior>
          <a style={{ color: '#3498db', textDecoration: 'none', fontSize: '14px', marginBottom: '10px', display: 'inline-block' }}>
            ← Back to Fleet
          </a>
        </Link>
        <h1 style={{ margin: '10px 0 0 0', color: '#222', fontSize: '32px' }}>Vehicle Risk Analysis</h1>
        <p style={{ color: '#666', marginTop: '5px', fontSize: '14px' }}>Real-time incident detection: speeding, harsh braking, sharp turns, and aggressive driving</p>
      </div>

      {/* Controls */}
      <div style={{ background: '#fff', padding: '15px', borderRadius: '12px', marginBottom: '20px', boxShadow: '0 2px 8px #eee' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '15px', marginBottom: '15px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '5px', color: '#666' }}>
              Select Vehicle
            </label>
            <select
              value={selectedVehicle}
              onChange={(e) => setSelectedVehicle(e.target.value)}
              style={{
                width: '100%',
                padding: '8px',
                border: '1px solid #ddd',
                borderRadius: '6px',
                fontSize: '14px',
                background: '#fff',
                fontWeight: 600
              }}
            >
              <option value="">-- Select Vehicle --</option>
              {vehicles.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.name || v.id}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '5px', color: '#666' }}>
              Time Period (hours)
            </label>
            <input
              type="number"
              min="1"
              max="720"
              value={timePeriod}
              onChange={(e) => setTimePeriod(Math.max(1, parseInt(e.target.value) || 24))}
              style={{ width: '100%', padding: '8px', border: '1px solid #ddd', borderRadius: '6px', fontSize: '14px' }}
            />
          </div>
          <div style={{ display: 'flex', alignItems: 'flex-end' }}>
            <button
              onClick={handleRefresh}
              style={{
                width: '100%',
                padding: '8px 15px',
                background: '#3498db',
                color: '#fff',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
                fontWeight: 600,
                fontSize: '14px'
              }}
            >
              {loading ? 'Analyzing...' : 'Refresh Analysis'}
            </button>
          </div>
        </div>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '40px', color: '#666' }}>
          <div style={{ fontSize: '16px', marginBottom: '10px' }}>⏳ Analyzing fleet data...</div>
          <div style={{ fontSize: '12px', color: '#999' }}>This may take a moment</div>
        </div>
      ) : data ? (
        <>
          {/* Summary Stats */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '15px', marginBottom: '30px' }}>
            <div style={{ background: '#fff', padding: '20px', borderRadius: '12px', boxShadow: '0 2px 8px #eee' }}>
              <div style={{ fontSize: '12px', color: '#999', fontWeight: 600, marginBottom: '5px' }}>TOTAL INCIDENTS</div>
              <div style={{ fontSize: '28px', fontWeight: 700, color: '#e74c3c' }}>{data.summary.total_alerts.toLocaleString()}</div>
              <div style={{ fontSize: '11px', color: '#666', marginTop: '5px' }}>Last {data.summary.time_period_hours}h</div>
            </div>

            <div style={{ background: '#fff', padding: '20px', borderRadius: '12px', boxShadow: '0 2px 8px #eee' }}>
              <div style={{ fontSize: '12px', color: '#999', fontWeight: 600, marginBottom: '5px' }}>⚡ AGGRESSIVE SPEED</div>
              <div style={{ fontSize: '28px', fontWeight: 700, color: '#c0392b' }}>{data.summary.aggressive_speeding || 0}</div>
              <div style={{ fontSize: '11px', color: '#666', marginTop: '5px' }}>20%+ over limit</div>
            </div>

            <div style={{ background: '#fff', padding: '20px', borderRadius: '12px', boxShadow: '0 2px 8px #eee' }}>
              <div style={{ fontSize: '12px', color: '#999', fontWeight: 600, marginBottom: '5px' }}>🐢 SLOW DRIVING</div>
              <div style={{ fontSize: '28px', fontWeight: 700, color: '#e74c3c' }}>{data.summary.slow_driving || 0}</div>
              <div style={{ fontSize: '11px', color: '#666', marginTop: '5px' }}>Below expected speed</div>
            </div>

            <div style={{ background: '#fff', padding: '20px', borderRadius: '12px', boxShadow: '0 2px 8px #eee' }}>
              <div style={{ fontSize: '12px', color: '#999', fontWeight: 600, marginBottom: '5px' }}>🛑 HARSH BRAKING</div>
              <div style={{ fontSize: '28px', fontWeight: 700, color: '#e67e22' }}>{data.summary.harsh_braking || 0}</div>
              <div style={{ fontSize: '11px', color: '#666', marginTop: '5px' }}>Rapid deceleration</div>
            </div>

            <div style={{ background: '#fff', padding: '20px', borderRadius: '12px', boxShadow: '0 2px 8px #eee' }}>
              <div style={{ fontSize: '12px', color: '#999', fontWeight: 600, marginBottom: '5px' }}>🔄 SHARP TURNS</div>
              <div style={{ fontSize: '28px', fontWeight: 700, color: '#e67e22' }}>{data.summary.sharp_turns || 0}</div>
              <div style={{ fontSize: '11px', color: '#666', marginTop: '5px' }}>60°+ turns</div>
            </div>

            <div style={{ background: '#fff', padding: '20px', borderRadius: '12px', boxShadow: '0 2px 8px #eee' }}>
              <div style={{ fontSize: '12px', color: '#999', fontWeight: 600, marginBottom: '5px' }}>📈 RAPID ACCEL</div>
              <div style={{ fontSize: '28px', fontWeight: 700, color: '#f39c12' }}>{data.summary.rapid_acceleration || 0}</div>
              <div style={{ fontSize: '11px', color: '#666', marginTop: '5px' }}>Fast acceleration</div>
            </div>
          </div>

          {/* Top Alerts */}
          <div style={{ background: '#fff', padding: '20px', borderRadius: '12px', marginBottom: '30px', boxShadow: '0 2px 8px #eee' }}>
            <h2 style={{ fontSize: '18px', fontWeight: 700, marginBottom: '15px', color: '#222' }}>⚠️ Critical Incidents</h2>
            {data.alerts.length === 0 ? (
              <div style={{ padding: '30px', textAlign: 'center', color: '#999' }}>
                <div style={{ fontSize: '16px', fontWeight: 600, marginBottom: '5px' }}>✅ No incidents detected</div>
                <div style={{ fontSize: '12px' }}>Great driving! No harsh incidents in the selected period.</div>
              </div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                  <thead>
                    <tr style={{ borderBottom: '2px solid #eee' }}>
                      <th style={{ textAlign: 'left', padding: '10px', fontWeight: 600, color: '#666' }}>Type</th>
                      <th style={{ textAlign: 'left', padding: '10px', fontWeight: 600, color: '#666' }}>Location</th>
                      <th style={{ textAlign: 'left', padding: '10px', fontWeight: 600, color: '#666' }}>Details</th>
                      <th style={{ textAlign: 'left', padding: '10px', fontWeight: 600, color: '#666' }}>Time</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.alerts.slice(0, 30).map((alert, idx) => (
                      <tr key={idx} style={{ borderBottom: '1px solid #f0f0f0', background: idx % 2 ? '#fafafa' : '#fff' }}>
                        <td style={{ padding: '10px' }}>
                          <span style={{
                            display: 'inline-block',
                            padding: '4px 8px',
                            borderRadius: '4px',
                            background: getSeverityColor(alert.severity, alert.alert_type),
                            color: '#fff',
                            fontSize: '11px',
                            fontWeight: 600
                          }}>
                            {getAlertIcon(alert.alert_type)} {alert.alert_type}
                          </span>
                        </td>
                        <td style={{ padding: '10px', color: '#666', fontSize: '12px', maxWidth: '200px' }}>
                          {alertAddresses[idx] || `${alert.location.latitude.toFixed(4)}, ${alert.location.longitude.toFixed(4)}`}
                        </td>
                        <td style={{ padding: '10px', color: '#333', fontSize: '12px' }}>
                          {alert.alert_type === 'Aggressive Speeding' && `${alert.excess_speed} km/h over (${alert.current_speed} vs ${alert.estimated_limit} limit)`}
                          {alert.alert_type === 'Slow Driving' && `${alert.current_speed} km/h (expected ~${alert.expected_speed})`}
                          {alert.alert_type === 'Harsh Braking' && `${alert.speed_change} km/h drop in ${alert.time_taken}s (${alert.speed_before} → ${alert.speed_after}) @ ${alert.deceleration_rate} km/h/s`}
                          {alert.alert_type === 'Rapid Acceleration' && `${alert.speed_change} km/h gain in ${alert.time_taken}s (${alert.speed_before} → ${alert.speed_after}) @ ${alert.acceleration_rate} km/h/s`}
                          {alert.alert_type === 'Sharp Turn' && `${alert.turn_angle}° turn at ${alert.speed_during_turn} km/h`}
                        </td>
                        <td style={{ padding: '10px', color: '#999', fontSize: '12px' }}>
                          {new Date(alert.timestamp).toLocaleTimeString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            {data.alerts.length > 0 && (
              <div style={{ marginTop: '15px', fontSize: '12px', color: '#666' }}>
                Showing 1-{Math.min(30, data.alerts.length)} of {data.alerts.length} incidents
              </div>
            )}
          </div>

          {/* Vehicle Stats */}
          {data.vehicle_stats && Object.keys(data.vehicle_stats).length > 0 && (
            <div style={{ background: '#fff', padding: '20px', borderRadius: '12px', boxShadow: '0 2px 8px #eee' }}>
              <h2 style={{ fontSize: '18px', fontWeight: 700, marginBottom: '15px', color: '#222' }}>📊 Vehicle Speed Profile</h2>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '15px' }}>
                {Object.entries(data.vehicle_stats).map(([vehicleId, stats], idx) => (
                  <div key={idx} style={{
                    background: '#f8f9fa',
                    padding: '15px',
                    borderRadius: '8px',
                    border: '1px solid #ddd'
                  }}>
                    <div style={{ fontSize: '12px', fontWeight: 600, color: '#666', marginBottom: '10px' }}>
                      {vehicleId}
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                      <div>
                        <div style={{ fontSize: '10px', color: '#999' }}>MIN</div>
                        <div style={{ fontSize: '16px', fontWeight: 700, color: '#27ae60' }}>{stats.min} km/h</div>
                      </div>
                      <div>
                        <div style={{ fontSize: '10px', color: '#999' }}>MAX</div>
                        <div style={{ fontSize: '16px', fontWeight: 700, color: '#e74c3c' }}>{stats.max} km/h</div>
                      </div>
                      <div style={{ gridColumn: '1 / -1' }}>
                        <div style={{ fontSize: '10px', color: '#999' }}>AVERAGE</div>
                        <div style={{ fontSize: '16px', fontWeight: 700, color: '#3498db' }}>{stats.avg.toFixed(1)} km/h</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      ) : null}
    </div>
  );
}
