import { useEffect, useState } from 'react';
import Link from 'next/link';

export default function RiskAnalysis() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [timePeriod, setTimePeriod] = useState(72);
  const [minSpeedChange, setMinSpeedChange] = useState(5);

  const fetchAnalysis = async (hours, speedChange) => {
    setLoading(true);
    try {
      const response = await fetch(
        `http://localhost:8000/api/advanced_risk_analysis?time_period_hours=${hours}&min_speed_change=${speedChange}`
      );
      const result = await response.json();
      setData(result);
    } catch (error) {
      console.error('Failed to fetch analysis:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalysis(timePeriod, minSpeedChange);
  }, []);

  const handleRefresh = () => {
    fetchAnalysis(timePeriod, minSpeedChange);
  };

  const getSeverityColor = (severity) => {
    if (severity > 0.7) return '#e74c3c';
    if (severity > 0.4) return '#f39c12';
    return '#27ae60';
  };

  const getRiskLevelColor = (riskLevel) => {
    if (riskLevel === 'High') return '#e74c3c';
    if (riskLevel === 'Medium') return '#f39c12';
    return '#27ae60';
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
        <h1 style={{ margin: '10px 0 0 0', color: '#222', fontSize: '32px' }}>Advanced Risk Analysis</h1>
        <p style={{ color: '#666', marginTop: '5px', fontSize: '14px' }}>Detailed analysis of driving incidents, speed patterns, and risky locations</p>
      </div>

      {/* Controls */}
      <div style={{ background: '#fff', padding: '15px', borderRadius: '12px', marginBottom: '20px', boxShadow: '0 2px 8px #eee' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '15px', marginBottom: '15px' }}>
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
          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '5px', color: '#666' }}>
              Min Speed Change (km/h)
            </label>
            <input
              type="number"
              min="1"
              max="50"
              value={minSpeedChange}
              onChange={(e) => setMinSpeedChange(Math.max(1, parseInt(e.target.value) || 5))}
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
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '15px', marginBottom: '30px' }}>
            <div style={{ background: '#fff', padding: '20px', borderRadius: '12px', boxShadow: '0 2px 8px #eee' }}>
              <div style={{ fontSize: '12px', color: '#999', fontWeight: 600, marginBottom: '5px' }}>TOTAL ALERTS</div>
              <div style={{ fontSize: '28px', fontWeight: 700, color: '#e74c3c' }}>{data.summary.total_alerts.toLocaleString()}</div>
              <div style={{ fontSize: '11px', color: '#666', marginTop: '5px' }}>Last {data.summary.time_period_hours}h</div>
            </div>

            <div style={{ background: '#fff', padding: '20px', borderRadius: '12px', boxShadow: '0 2px 8px #eee' }}>
              <div style={{ fontSize: '12px', color: '#999', fontWeight: 600, marginBottom: '5px' }}>SPEEDING</div>
              <div style={{ fontSize: '28px', fontWeight: 700, color: '#f39c12' }}>{data.summary.speeding_alerts.toLocaleString()}</div>
              <div style={{ fontSize: '11px', color: '#666', marginTop: '5px' }}>Speed limit violations</div>
            </div>

            <div style={{ background: '#fff', padding: '20px', borderRadius: '12px', boxShadow: '0 2px 8px #eee' }}>
              <div style={{ fontSize: '12px', color: '#999', fontWeight: 600, marginBottom: '5px' }}>HARSH DRIVING</div>
              <div style={{ fontSize: '28px', fontWeight: 700, color: '#e74c3c' }}>
                {(data.summary.rapid_acceleration + data.summary.hard_braking).toLocaleString()}
              </div>
              <div style={{ fontSize: '11px', color: '#666', marginTop: '5px' }}>Accel + Braking</div>
            </div>

            <div style={{ background: '#fff', padding: '20px', borderRadius: '12px', boxShadow: '0 2px 8px #eee' }}>
              <div style={{ fontSize: '12px', color: '#999', fontWeight: 600, marginBottom: '5px' }}>HOTSPOTS</div>
              <div style={{ fontSize: '28px', fontWeight: 700, color: '#3498db' }}>{data.summary.alert_hotspots}</div>
              <div style={{ fontSize: '11px', color: '#666', marginTop: '5px' }}>High-risk routes</div>
            </div>
          </div>

          {/* Top Alerts */}
          <div style={{ background: '#fff', padding: '20px', borderRadius: '12px', marginBottom: '30px', boxShadow: '0 2px 8px #eee' }}>
            <h2 style={{ fontSize: '18px', fontWeight: 700, marginBottom: '15px', color: '#222' }}>🚨 Critical Incidents</h2>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                <thead>
                  <tr style={{ borderBottom: '2px solid #eee' }}>
                    <th style={{ textAlign: 'left', padding: '10px', fontWeight: 600, color: '#666' }}>Vehicle</th>
                    <th style={{ textAlign: 'left', padding: '10px', fontWeight: 600, color: '#666' }}>Type</th>
                    <th style={{ textAlign: 'left', padding: '10px', fontWeight: 600, color: '#666' }}>Location</th>
                    <th style={{ textAlign: 'left', padding: '10px', fontWeight: 600, color: '#666' }}>Details</th>
                    <th style={{ textAlign: 'left', padding: '10px', fontWeight: 600, color: '#666' }}>Time</th>
                  </tr>
                </thead>
                <tbody>
                  {data.alerts.slice(0, 20).map((alert, idx) => (
                    <tr key={idx} style={{ borderBottom: '1px solid #f0f0f0', background: idx % 2 ? '#fafafa' : '#fff' }}>
                      <td style={{ padding: '10px', color: '#333' }}>
                        <strong>{alert.vehicle_name}</strong>
                      </td>
                      <td style={{ padding: '10px' }}>
                        <span style={{
                          display: 'inline-block',
                          padding: '4px 8px',
                          borderRadius: '4px',
                          background: getSeverityColor(alert.severity),
                          color: '#fff',
                          fontSize: '11px',
                          fontWeight: 600
                        }}>
                          {alert.alert_type}
                        </span>
                      </td>
                      <td style={{ padding: '10px', color: '#666', fontSize: '12px' }}>
                        {alert.location.latitude.toFixed(3)}, {alert.location.longitude.toFixed(3)}
                      </td>
                      <td style={{ padding: '10px', color: '#333' }}>
                        {alert.alert_type === 'Speeding' && `${alert.excess_speed}km/h over`}
                        {alert.alert_type === 'Hard Braking' && `${alert.speed_change}km/h drop`}
                        {alert.alert_type === 'Rapid Acceleration' && `${alert.speed_change}km/h gain`}
                        {alert.alert_type === 'Stop/Idle' && 'Vehicle stopped'}
                      </td>
                      <td style={{ padding: '10px', color: '#999', fontSize: '12px' }}>
                        {new Date(alert.timestamp).toLocaleTimeString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div style={{ marginTop: '15px', fontSize: '12px', color: '#666' }}>
              Showing 1-20 of {data.alerts.length} incidents
            </div>
          </div>

          {/* Hotspots */}
          <div style={{ background: '#fff', padding: '20px', borderRadius: '12px', marginBottom: '30px', boxShadow: '0 2px 8px #eee' }}>
            <h2 style={{ fontSize: '18px', fontWeight: 700, marginBottom: '15px', color: '#222' }}>📍 High-Risk Locations</h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '15px' }}>
              {data.hotspots.slice(0, 9).map((hotspot, idx) => (
                <div key={idx} style={{
                  background: '#f8f9fa',
                  padding: '15px',
                  borderRadius: '8px',
                  border: `2px solid ${getRiskLevelColor(hotspot.risk_level)}`,
                  position: 'relative'
                }}>
                  <div style={{
                    position: 'absolute',
                    top: '10px',
                    right: '10px',
                    font: '12px',
                    fontWeight: 600,
                    color: getRiskLevelColor(hotspot.risk_level),
                    background: '#fff',
                    padding: '4px 8px',
                    borderRadius: '4px'
                  }}>
                    {hotspot.risk_level} RISK
                  </div>
                  <div style={{ marginBottom: '12px' }}>
                    <div style={{ fontSize: '13px', fontWeight: 600, color: '#333', marginBottom: '4px' }}>
                      📍 {hotspot.location}
                    </div>
                    <div style={{ fontSize: '11px', color: '#666' }}>
                      Avg Speed: <strong>{hotspot.avg_speed} km/h</strong>
                    </div>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', fontSize: '12px' }}>
                    <div>
                      <div style={{ color: '#999', fontSize: '10px' }}>ALERTS</div>
                      <div style={{ fontWeight: 700, color: '#e74c3c' }}>{hotspot.alert_count}</div>
                    </div>
                    <div>
                      <div style={{ color: '#999', fontSize: '10px' }}>VEHICLES</div>
                      <div style={{ fontWeight: 700, color: '#3498db' }}>{hotspot.vehicles_affected}</div>
                    </div>
                    <div>
                      <div style={{ color: '#999', fontSize: '10px' }}>PASSES</div>
                      <div style={{ fontWeight: 700, color: '#666' }}>{hotspot.passes}</div>
                    </div>
                    <div>
                      <div style={{ color: '#999', fontSize: '10px' }}>INCIDENT RATE</div>
                      <div style={{ fontWeight: 700, color: '#666' }}>{((hotspot.alert_count / hotspot.passes) * 100).toFixed(1)}%</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Vehicle Stats */}
          <div style={{ background: '#fff', padding: '20px', borderRadius: '12px', boxShadow: '0 2px 8px #eee' }}>
            <h2 style={{ fontSize: '18px', fontWeight: 700, marginBottom: '15px', color: '#222' }}>🚗 Vehicle Speed Profiles</h2>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                <thead>
                  <tr style={{ borderBottom: '2px solid #eee' }}>
                    <th style={{ textAlign: 'left', padding: '10px', fontWeight: 600, color: '#666' }}>Vehicle</th>
                    <th style={{ textAlign: 'right', padding: '10px', fontWeight: 600, color: '#666' }}>Min Speed</th>
                    <th style={{ textAlign: 'right', padding: '10px', fontWeight: 600, color: '#666' }}>Max Speed</th>
                    <th style={{ textAlign: 'right', padding: '10px', fontWeight: 600, color: '#666' }}>Avg Speed</th>
                    <th style={{ textAlign: 'right', padding: '10px', fontWeight: 600, color: '#666' }}>Records</th>
                  </tr>
                </thead>
                <tbody>
                  {Object.entries(data.vehicle_stats).slice(0, 15).map(([vehicleId, stats], idx) => (
                    <tr key={idx} style={{ borderBottom: '1px solid #f0f0f0', background: idx % 2 ? '#fafafa' : '#fff' }}>
                      <td style={{ padding: '10px', fontWeight: 600, color: '#333' }}>{vehicleId}</td>
                      <td style={{ padding: '10px', textAlign: 'right', color: '#666' }}>{stats.min} km/h</td>
                      <td style={{ padding: '10px', textAlign: 'right', color: '#666' }}>{stats.max} km/h</td>
                      <td style={{ padding: '10px', textAlign: 'right', color: '#333', fontWeight: 600 }}>{stats.avg.toFixed(1)} km/h</td>
                      <td style={{ padding: '10px', textAlign: 'right', color: '#666' }}>{stats.records}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      ) : null}
    </div>
  );
}
