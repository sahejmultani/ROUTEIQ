import { useEffect, useState } from 'react';
import Link from 'next/link';
import Navbar from '../components/Navbar';

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
    
    let intersection = null;
    if (address.road) {
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
  const [dateFilter, setDateFilter] = useState('all');
  const [specificDate, setSpecificDate] = useState('');
  const [addressCache, setAddressCache] = useState({});
  const [alertAddresses, setAlertAddresses] = useState({});

  useEffect(() => {
    const fetchVehicles = async () => {
      try {
        const response = await fetch('http://localhost:8000/api/vehicles');
        const result = await response.json();
        const vehicleList = Array.isArray(result) ? result : result.vehicles || [];
        if (vehicleList.length > 0) {
          setVehicles(vehicleList);
          setSelectedVehicle(vehicleList[0].id);
        }
      } catch (error) {
        console.error('Failed to fetch vehicles:', error);
      }
    };
    fetchVehicles();
  }, []);

  const fetchAnalysis = async (filter, vehicleId = null, date = '') => {
    setLoading(true);
    try {
      let url = `http://localhost:8000/api/advanced_risk_analysis?date_filter=${filter}`;
      if (vehicleId) {
        url += `&vehicle_id=${vehicleId}`;
      }
      if (date) {
        url += `&specific_date=${date}`;
      }
      
      const response = await fetch(url);
      const result = await response.json();
      setData(result);

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

  useEffect(() => {
    if (selectedVehicle) {
      fetchAnalysis(dateFilter, selectedVehicle, specificDate);
    }
  }, [selectedVehicle, dateFilter, specificDate]);

  const handleRefresh = () => {
    fetchAnalysis(dateFilter, selectedVehicle, specificDate);
  };

  const getSeverityColor = (severity, alertType) => {
    if (alertType === 'Aggressive Speeding' || alertType === 'Harsh Braking') return '#c0392b';
    if (alertType === 'Slow Driving' || alertType === 'Rapid Acceleration') return '#e74c3c';
    if (alertType === 'Sharp Turn') return '#e67e22';
    if (severity > 0.7) return '#e74c3c';
    if (severity > 0.4) return '#f39c12';
    return '#27ae60';
  };

  const getAlertIcon = (alertType) => {
    switch (alertType) {
      case 'Aggressive Speeding': return '⚡';
      case 'Harsh Braking': return '🛑';
      case 'Rapid Acceleration': return '📈';
      case 'Slow Driving': return '🐢';
      case 'Sharp Turn': return '🔄';
      default: return '⚠️';
    }
  };

  return (
    <div style={{ 
      padding: '0', 
      fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif', 
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', 
      minHeight: '100vh'
    }}>
      <Navbar />

      {/* Main Content */}
      <div style={{ padding: '40px 30px', maxWidth: '1400px', margin: '0 auto' }}>
        {/* Page Header */}
        <div style={{ marginBottom: '32px', color: '#fff' }}>
          <h2 style={{ margin: '0 0 12px 0', fontSize: '40px', fontWeight: 700 }}>Vehicle Risk Dashboard</h2>
          <p style={{ margin: '0', fontSize: '16px', opacity: 0.9, maxWidth: '600px' }}>
            Monitor real-time driving incidents including speeding, harsh braking, sharp turns, and aggressive acceleration
          </p>
        </div>

        {/* Controls Card */}
        <div style={{ 
          background: 'rgba(255, 255, 255, 0.95)', 
          backdropFilter: 'blur(15px)', 
          padding: '28px', 
          borderRadius: '16px', 
          marginBottom: '28px', 
          boxShadow: '0 8px 32px rgba(0,0,0,0.15)',
          border: '1px solid rgba(255,255,255,0.3)'
        }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '20px' }}>
            {/* Vehicle Selector */}
            <div>
              <label style={{ 
                display: 'block', 
                fontSize: '13px', 
                fontWeight: 700, 
                marginBottom: '10px', 
                color: '#667eea',
                textTransform:  'uppercase',
                letterSpacing: '0.5px'
              }}>
                🚙 Select Vehicle
              </label>
              <select
                value={selectedVehicle}
                onChange={(e) => setSelectedVehicle(e.target.value)}
                style={{
                  width: '100%',
                  padding: '12px 14px',
                  border: '2px solid #e0e0e0',
                  borderRadius: '10px',
                  fontSize: '14px',
                  background: '#fff',
                  fontWeight: 600,
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  outline: 'none'
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

            {/* Time Period Filter */}
            <div>
              <label style={{ 
                display: 'block', 
                fontSize: '13px', 
                fontWeight: 700, 
                marginBottom: '10px', 
                color: '#667eea',
                textTransform: 'uppercase',
                letterSpacing: '0.5px'
              }}>
                📅 Time Period
              </label>
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                {['all', 'today', 'lastWeek', 'lastMonth'].map((filter) => (
                  <button
                    key={filter}
                    onClick={() => {
                      setDateFilter(filter);
                      setSpecificDate('');
                    }}
                    style={{
                      padding: '10px 14px',
                      background: dateFilter === filter ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' : '#f0f0f0',
                      color: dateFilter === filter ? '#fff' : '#333',
                      border: 'none',
                      borderRadius: '8px',
                      cursor: 'pointer',
                      fontWeight: 600,
                      fontSize: '13px',
                      transition: 'all 0.2s',
                      flex: '1',
                      minWidth: '70px'
                    }}
                  >
                    {filter === 'all' ? 'All Time' : filter === 'today' ? 'Today' : filter === 'lastWeek' ? 'Week' : 'Month'}
                  </button>
                ))}
              </div>
            </div>

            {/* Specific Date */}
            <div>
              <label style={{ 
                display: 'block', 
                fontSize: '13px', 
                fontWeight: 700, 
                marginBottom: '10px', 
                color: '#667eea',
                textTransform: 'uppercase',
                letterSpacing: '0.5px'
              }}>
                📆 Specific Date
              </label>
              <input
                type="date"
                value={specificDate}
                onChange={(e) => {
                  setSpecificDate(e.target.value);
                  setDateFilter('');
                }}
                style={{ 
                  width: '100%', 
                  padding: '12px 14px', 
                  border: '2px solid #e0e0e0', 
                  borderRadius: '10px', 
                  fontSize: '14px', 
                  outline: 'none', 
                  cursor: 'pointer',
                  fontWeight: 600
                }}
              />
            </div>

            {/* Refresh Button */}
            <div style={{ display: 'flex', alignItems: 'flex-end' }}>
              <button
                onClick={handleRefresh}
                style={{
                  width: '100%',
                  padding: '12px 20px',
                  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '10px',
                  cursor: 'pointer',
                  fontWeight: 700,
                  fontSize: '14px',
                  transition: 'all 0.2s'
                }}
              >
                {loading ? '⏳ Analyzing...' : '🔄 Refresh'}
              </button>
            </div>
          </div>
        </div>

        {/* Content Area */}
        {loading && !data ? (
          <div style={{ textAlign: 'center', padding: '80px 20px', color: '#fff' }}>
            <div style={{ fontSize: '56px', marginBottom: '20px', animation: 'pulse 2s infinite' }}>⏳</div>
            <p style={{ fontSize: '20px', fontWeight: 600, marginBottom: '8px' }}>Analyzing vehicle data...</p>
            <p style={{ fontSize: '16px', opacity: 0.8 }}>Please wait a moment while we process the telematics</p>
          </div>
        ) : data ? (
          <>
            {/* Stats Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px', marginBottom: '28px' }}>
              {[
                { label: 'Total Incidents', value: data.summary?.total_alerts || 0, gradient: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)', icon: '📊' },
                { label: 'Aggressive Speeding', value: data.summary?.aggressive_speeding || 0, gradient: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)', icon: '⚡' },
                { label: 'Slow Driving', value: data.summary?.slow_driving || 0, gradient: 'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)', icon: '🐢' },
                { label: 'Harsh Braking', value: data.summary?.harsh_braking || 0, gradient: 'linear-gradient(135deg, #fa709a 0%, #fee140 100%)', icon: '🛑' }
              ].map((stat, idx) => (
                <div key={idx} style={{ 
                  background: stat.gradient, 
                  padding: '24px', 
                  borderRadius: '14px', 
                  boxShadow: '0 8px 32px rgba(0,0,0,0.15)',
                  color: '#fff',
                  border: '1px solid rgba(255,255,255,0.2)'
                }}>
                  <div style={{ fontSize: '28px', marginBottom: '12px' }}>{stat.icon}</div>
                  <div style={{ fontSize: '12px', fontWeight: 600, marginBottom: '8px', opacity: 0.9, textTransform: 'uppercase', letterSpacing: '0.5px' }}>{stat.label}</div>
                  <div style={{ fontSize: '36px', fontWeight: 700 }}>{stat.value.toLocaleString()}</div>
                </div>
              ))}
            </div>

            {/* Alerts List */}
            <div style={{ 
              background: 'rgba(255, 255, 255, 0.95)', 
              backdropFilter: 'blur(15px)', 
              borderRadius: '16px', 
              overflow: 'hidden',
              boxShadow: '0 8px 32px rgba(0,0,0,0.15)',
              border: '1px solid rgba(255,255,255,0.3)'
            }}>
              <div style={{ padding: '24px', borderBottom: '1px solid #f0f0f0' }}>
                <h3 style={{ margin: '0', fontSize: '18px', fontWeight: 700, color: '#222' }}>
                  Latest Incidents ({(data.alerts || []).length} events)
                </h3>
              </div>

              <div style={{ maxHeight: '600px', overflowY: 'auto' }}>
                {(data.alerts || []).slice(0, 25).map((alert, idx) => (
                  <div key={idx} style={{ 
                    padding: '16px 24px', 
                    borderBottom: '1px solid #f0f0f0',
                    display: 'flex',
                    gap: '16px',
                    alignItems: 'start',
                    transition: 'all 0.2s',
                    cursor: 'pointer'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.background = '#f8f9fa'}
                  onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                  >
                    <div style={{ 
                      fontSize: '24px',
                      minWidth: '40px',
                      textAlign: 'center'
                    }}>
                      {getAlertIcon(alert.alert_type)}
                    </div>
                    
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '8px' }}>
                        <div>
                          <h4 style={{ margin: '0 0 4px 0', fontSize: '14px', fontWeight: 700, color: '#222' }}>
                            {alert.alert_type}
                          </h4>
                          <p style={{ margin: '0', fontSize: '12px', color: '#666' }}>
                            {alertAddresses[idx] || 'Loading location...'}
                          </p>
                        </div>
                        <div style={{ 
                          background: getSeverityColor(alert.severity, alert.alert_type),
                          color: '#fff',
                          padding: '6px 12px',
                          borderRadius: '6px',
                          fontSize: '12px',
                          fontWeight: 600
                        }}>
                          {(alert.severity * 100).toFixed(0)}%
                        </div>
                      </div>

                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '12px', fontSize: '12px' }}>
                        <div><span style={{ color: '#999' }}>Speed:</span> <span style={{ fontWeight: 600, color: '#222' }}>{alert.current_speed} km/h</span></div>
                        <div><span style={{ color: '#999' }}>Limit:</span> <span style={{ fontWeight: 600, color: '#222' }}>{alert.estimated_limit} km/h</span></div>
                        <div><span style={{ color: '#999' }}>Time:</span> <span style={{ fontWeight: 600, color: '#222' }}>{new Date(alert.timestamp).toLocaleString()}</span></div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </>
        ) : (
          <div style={{ textAlign: 'center', padding: '60px 20px', color: '#fff' }}>
            <div style={{ fontSize: '48px', marginBottom: '16px' }}>📭</div>
            <p style={{ fontSize: '18px', fontWeight: 600 }}>No data available</p>
            <p style={{ fontSize: '14px', opacity: 0.8 }}>Select a vehicle to view risk analysis</p>
          </div>
        )}
      </div>

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.6; }
        }
      `}</style>
    </div>
  );
}
