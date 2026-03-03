
import React, { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import Head from 'next/head';
import Link from 'next/link';
import Navbar from '../components/Navbar';
import styles from '../styles/routing.module.css';

const CombinedHeatmapRoute = dynamic(() => import('../components/CombinedHeatmapRoute'), {
  ssr: false,
  loading: () => <div className={styles.mapLoading}>Loading map...</div>,
});

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

export default function HeatmapPage() {
  const [startAddress, setStartAddress] = useState('');
  const [endAddress, setEndAddress] = useState('');
  const [startAddressSuggestions, setStartAddressSuggestions] = useState([]);
  const [endAddressSuggestions, setEndAddressSuggestions] = useState([]);
  const [showStartSuggestions, setShowStartSuggestions] = useState(false);
  const [showEndSuggestions, setShowEndSuggestions] = useState(false);
  const [startCoords, setStartCoords] = useState(null);
  const [endCoords, setEndCoords] = useState(null);
  const [routes, setRoutes] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [selectedRoute, setSelectedRoute] = useState(null);
  const [routeRisks, setRouteRisks] = useState({});
  const [vehicles, setVehicles] = useState([]);
  const [selectedVehicle, setSelectedVehicle] = useState(null);

  useEffect(() => {
    fetchVehicles();
  }, []);

  const fetchVehicles = async () => {
    try {
      const url = `${API_URL}/api/vehicles`;
      const response = await fetch(url, {
        method: 'GET',
        headers: { 'Accept': 'application/json' },
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const data = await response.json();
      setVehicles(Array.isArray(data) ? data : []);
      setError(null);
    } catch (err) {
      console.error('Error fetching vehicles:', err.message);
      setVehicles([]);
    }
  };

  const getAddressSuggestions = async (query) => {
    if (!query || query.length < 2) return [];
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=5`,
        { headers: { 'User-Agent': 'RouteIQ/1.0' } }
      );
      if (!response.ok) return [];
      const data = await response.json();
      return data.map(item => ({
        display_name: item.display_name,
        latitude: parseFloat(item.lat),
        longitude: parseFloat(item.lon),
      }));
    } catch (err) {
      return [];
    }
  };

  const handleStartAddressChange = async (e) => {
    const value = e.target.value;
    setStartAddress(value);
    if (value.length > 0) {
      const suggestions = await getAddressSuggestionsWithVehicles(value);
      setStartAddressSuggestions(suggestions);
      setShowStartSuggestions(suggestions.length > 0);
    } else {
      setShowStartSuggestions(false);
    }
  };

  const handleEndAddressChange = async (e) => {
    const value = e.target.value;
    setEndAddress(value);
    if (value.length > 0) {
      const suggestions = await getAddressSuggestionsWithVehicles(value);
      setEndAddressSuggestions(suggestions);
      setShowEndSuggestions(suggestions.length > 0);
    } else {
      setShowEndSuggestions(false);
    }
  };

  const selectStartSuggestion = (suggestion) => {
    if (suggestion.type === 'vehicle') {
      setSelectedVehicle(suggestion.id);
      handleUseVehicleLocation(suggestion.id);
      setStartAddress(suggestion.display_name);
    } else {
      setStartAddress(suggestion.display_name);
      setStartCoords(suggestion);
    }
    setShowStartSuggestions(false);
  };

  const selectEndSuggestion = (suggestion) => {
    if (suggestion.type === 'vehicle') {
      setEndAddress(suggestion.display_name);
      handleUseVehicleLocationForEnd(suggestion.id);
    } else {
      setEndAddress(suggestion.display_name);
      setEndCoords(suggestion);
    }
    setShowEndSuggestions(false);
  };

  const handleUseVehicleLocationForEnd = async (vehicleId) => {
    try {
      const response = await fetch(`${API_URL}/api/vehicle/${vehicleId}`, {
        method: 'GET',
        headers: { 'Accept': 'application/json' },
      });
      if (!response.ok) throw new Error('Failed to fetch vehicle location');
      const data = await response.json();
      const dashboard = data.dashboard;
      
      // Check if position is available as an object with lat/lng
      const position = dashboard?.lastReportedPosition;
      const hasValidPosition = position && typeof position === 'object' && position.latitude && position.longitude;
      
      // Fallback to direct latitude/longitude fields
      const latitude = hasValidPosition ? position.latitude : dashboard?.latitude;
      const longitude = hasValidPosition ? position.longitude : dashboard?.longitude;
      
      if (latitude && longitude) {
        setEndCoords({
          latitude: latitude,
          longitude: longitude,
          display_name: `${dashboard?.vehicleName || 'Vehicle'} (${latitude.toFixed(4)}, ${longitude.toFixed(4)})`,
        });
        setError(null);
      } else {
        setError('Vehicle location not available');
      }
    } catch (err) {
      setError(`Failed to get vehicle location: ${err.message}`);
    }
  };

  const getAddressSuggestionsWithVehicles = async (query) => {
    if (!query || query.length < 1) return [];
    
    const results = [];
    const queryLower = query.toLowerCase();
    
    // Add vehicle matches
    const vehicleMatches = vehicles.filter(v => 
      v.name.toLowerCase().includes(queryLower) || 
      (v.licensePlate && v.licensePlate.toLowerCase().includes(queryLower))
    );
    vehicleMatches.forEach(v => {
      results.push({
        type: 'vehicle',
        id: v.id,
        display_name: `🚗 ${v.name}${v.licensePlate ? ` (${v.licensePlate})` : ''}`,
        vehicle: v
      });
    });
    
    // Add address matches (only if more than 2 chars for API call)
    if (query.length > 2) {
      try {
        const response = await fetch(
          `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=5`,
          { headers: { 'User-Agent': 'RouteIQ/1.0' } }
        );
        if (response.ok) {
          const data = await response.json();
          data.forEach(item => {
            results.push({
              type: 'address',
              display_name: item.display_name,
              latitude: parseFloat(item.lat),
              longitude: parseFloat(item.lon),
            });
          });
        }
      } catch (err) {
        console.error('Error fetching address suggestions:', err);
      }
    }
    
    return results;
  };

  const handleUseVehicleLocation = async (vehicleId) => {
    try {
      const response = await fetch(`${API_URL}/api/vehicle/${vehicleId}`, {
        method: 'GET',
        headers: { 'Accept': 'application/json' },
      });
      if (!response.ok) throw new Error('Failed to fetch vehicle location');
      const data = await response.json();
      const dashboard = data.dashboard;
      
      // Check if position is available as an object with lat/lng
      const position = dashboard?.lastReportedPosition;
      const hasValidPosition = position && typeof position === 'object' && position.latitude && position.longitude;
      
      // Fallback to direct latitude/longitude fields
      const latitude = hasValidPosition ? position.latitude : dashboard?.latitude;
      const longitude = hasValidPosition ? position.longitude : dashboard?.longitude;
      
      if (latitude && longitude) {
        setStartCoords({
          latitude: latitude,
          longitude: longitude,
          display_name: `${dashboard?.vehicleName || 'Vehicle'} (${latitude.toFixed(4)}, ${longitude.toFixed(4)})`,
        });
        setStartAddress(`${dashboard?.vehicleName || 'Vehicle'} Location`);
        setSelectedVehicle(vehicleId);
        setError(null);
      } else {
        setError('Vehicle location not available');
      }
    } catch (err) {
      setError(`Failed to get vehicle location: ${err.message}`);
    }
  };

  const calculateRoute = async () => {
    if (!startCoords || !endCoords) {
      setError('Please enter both start and end addresses');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(
        `${API_URL}/api/route/calculate?start_lat=${startCoords.latitude}&start_lng=${startCoords.longitude}&end_lat=${endCoords.latitude}&end_lng=${endCoords.longitude}`,
        { method: 'GET', headers: { 'Accept': 'application/json' } }
      );
      if (!response.ok) throw new Error('Failed to calculate route');
      const data = await response.json();
      if (data.error) {
        setError(`Route calculation error: ${data.error}`);
        setLoading(false);
        return;
      }
      setRoutes(data);
      const risks = {};
      risks.fastest = await calculateRiskScore('fastest');
      risks.safe = await calculateRiskScore('safe');
      setRouteRisks(risks);
      setSelectedRoute('fastest');
    } catch (err) {
      setError(`Failed to calculate route: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const calculateRiskScore = async (routeType) => {
    try {
      const response = await fetch(`${API_URL}/api/route/risk-score?route_type=${routeType}`, {
        method: 'GET',
        headers: { 'Accept': 'application/json' },
      });
      if (!response.ok) throw new Error('Failed to calculate risk');
      return await response.json();
    } catch (err) {
      console.error(`Failed to calculate risk for ${routeType}:`, err);
      return { risk_score: 0.5, risk_level: 'Unknown' };
    }
  };

  const getRiskColor = (riskScore) => {
    if (riskScore < 0.3) return '#4CAF50';
    if (riskScore < 0.6) return '#FFC107';
    return '#F44336';
  };

  const getRiskLevel = (riskScore) => {
    if (riskScore < 0.3) return 'Low';
    if (riskScore < 0.6) return 'Moderate';
    return 'High';
  };

  return (
    <div style={{ 
      minHeight: '100vh', 
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', 
      fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif', 
      display: 'flex', 
      flexDirection: 'column' 
    }}>
      <Navbar />

      <Head>
        <title>Toronto Risk Heatmap & Routing</title>
        <meta name="description" content="Heatmap with integrated route planning" />
      </Head>

      {/* Main Content */}
      <div style={{ padding: '40px 30px', maxWidth: '1400px', margin: '0 auto', width: '100%', flex: 1 }}>
        {/* Page Header */}
        <div style={{ marginBottom: '32px', color: '#fff' }}>
          <h2 style={{ margin: '0 0 12px 0', fontSize: '40px', fontWeight: 700 }}>Heatmap & Route Planning</h2>
          <p style={{ margin: '0', fontSize: '16px', opacity: 0.9 }}>
            View high-risk driving areas and calculate safe routes
          </p>
        </div>

        {/* Main Layout */}
        <div style={{ display: 'grid', gridTemplateColumns: '320px 1fr', gap: '28px', minHeight: '600px' }}>
          {/* Left Panel - Routing Controls */}
          <div style={{ 
            background: 'rgba(255, 255, 255, 0.95)', 
            backdropFilter: 'blur(15px)', 
            padding: '24px', 
            borderRadius: '14px',
            boxShadow: '0 8px 32px rgba(0,0,0,0.15)',
            border: '1px solid rgba(255,255,255,0.3)',
            height: 'fit-content',
            position: 'sticky',
            top: '100px'
          }}>
            <h3 style={{ margin: '0 0 20px 0', fontSize: '16px', fontWeight: 700, color: '#222' }}>Calculate Route</h3>

            {/* Start Point */}
            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, marginBottom: '8px', color: '#667eea', textTransform: 'uppercase', letterSpacing: '0.5px' }} htmlFor="startAddress">
                📍 Start Point
              </label>
              <div style={{ position: 'relative' }}>
                <input
                  id="startAddress"
                  type="text"
                  placeholder="Starting address"
                  value={startAddress}
                  onChange={handleStartAddressChange}
                  onFocus={() => showStartSuggestions && setShowStartSuggestions(true)}
                  style={{
                    width: '100%',
                    padding: '12px 14px',
                    border: '2px solid #e0e0e0',
                    borderRadius: '10px',
                    fontSize: '14px',
                    outline: 'none',
                    fontWeight: 600,
                    boxSizing: 'border-box'
                  }}
                />
                {showStartSuggestions && startAddressSuggestions.length > 0 && (
                  <div style={{
                    position: 'absolute',
                    top: '100%',
                    left: 0,
                    right: 0,
                    background: '#fff',
                    border: '1px solid #e0e0e0',
                    borderTop: 'none',
                    borderRadius: '0 0 10px 10px',
                    maxHeight: '200px',
                    overflowY: 'auto',
                    zIndex: 10
                  }}>
                    {startAddressSuggestions.map((suggestion, idx) => (
                      <div
                        key={idx}
                        onClick={() => selectStartSuggestion(suggestion)}
                        style={{ 
                          padding: '12px 14px',
                          cursor: 'pointer',
                          borderBottom: '1px solid #f0f0f0',
                          backgroundColor: suggestion.type === 'vehicle' ? '#e3f2fd' : 'transparent',
                          fontWeight: suggestion.type === 'vehicle' ? 600 : 500,
                          fontSize: '13px',
                          transition: 'background 0.2s'
                        }}
                        onMouseEnter={(e) => e.target.style.background = suggestion.type === 'vehicle' ? '#bbdefb' : '#f5f5f5'}
                        onMouseLeave={(e) => e.target.style.background = suggestion.type === 'vehicle' ? '#e3f2fd' : 'transparent'}
                      >
                        {suggestion.display_name}
                      </div>
                    ))}
                  </div>
                )}
              </div>
              {startCoords && (
                <div style={{ fontSize: '12px', color: '#27ae60', marginTop: '8px', fontWeight: 600 }}>
                  ✓ {startCoords.display_name || `${startCoords.latitude.toFixed(4)}, ${startCoords.longitude.toFixed(4)}`}
                </div>
              )}
            </div>

            {/* End Point */}
            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, marginBottom: '8px', color: '#667eea', textTransform: 'uppercase', letterSpacing: '0.5px' }} htmlFor="endAddress">
                🎯 Destination
              </label>
              <div style={{ position: 'relative' }}>
                <input
                  id="endAddress"
                  type="text"
                  placeholder="Destination address"
                  value={endAddress}
                  onChange={handleEndAddressChange}
                  onFocus={() => showEndSuggestions && setShowEndSuggestions(true)}
                  style={{
                    width: '100%',
                    padding: '12px 14px',
                    border: '2px solid #e0e0e0',
                    borderRadius: '10px',
                    fontSize: '14px',
                    outline: 'none',
                    fontWeight: 600,
                    boxSizing: 'border-box'
                  }}
                />
                {showEndSuggestions && endAddressSuggestions.length > 0 && (
                  <div style={{
                    position: 'absolute',
                    top: '100%',
                    left: 0,
                    right: 0,
                    background: '#fff',
                    border: '1px solid #e0e0e0',
                    borderTop: 'none',
                    borderRadius: '0 0 10px 10px',
                    maxHeight: '200px',
                    overflowY: 'auto',
                    zIndex: 10
                  }}>
                    {endAddressSuggestions.map((suggestion, idx) => (
                      <div
                        key={idx}
                        onClick={() => selectEndSuggestion(suggestion)}
                        style={{ 
                          padding: '12px 14px',
                          cursor: 'pointer',
                          borderBottom: '1px solid #f0f0f0',
                          backgroundColor: suggestion.type === 'vehicle' ? '#e3f2fd' : 'transparent',
                          fontWeight: suggestion.type === 'vehicle' ? 600 : 500,
                          fontSize: '13px',
                          transition: 'background 0.2s'
                        }}
                        onMouseEnter={(e) => e.target.style.background = suggestion.type === 'vehicle' ? '#bbdefb' : '#f5f5f5'}
                        onMouseLeave={(e) => e.target.style.background = suggestion.type === 'vehicle' ? '#e3f2fd' : 'transparent'}
                      >
                        {suggestion.display_name}
                      </div>
                    ))}
                  </div>
                )}
              </div>
              {endCoords && (
                <div style={{ fontSize: '12px', color: '#27ae60', marginTop: '8px', fontWeight: 600 }}>
                  ✓ {endCoords.display_name || `${endCoords.latitude.toFixed(4)}, ${endCoords.longitude.toFixed(4)}`}
                </div>
              )}
            </div>

            {error && <div style={{ fontSize: '13px', color: '#c0392b', marginBottom: '16px', padding: '10px 12px', background: '#fadbd8', borderRadius: '8px', fontWeight: 600 }}>{error}</div>}

            <button
              onClick={calculateRoute}
              disabled={loading || !startCoords || !endCoords}
              style={{
                width: '100%',
                padding: '12px 20px',
                background: loading || !startCoords || !endCoords ? '#ccc' : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                color: '#fff',
                border: 'none',
                borderRadius: '10px',
                cursor: loading || !startCoords || !endCoords ? 'not-allowed' : 'pointer',
                fontWeight: 700,
                fontSize: '14px',
                transition: 'all 0.2s'
              }}
            >
              {loading ? '⏳ Calculating...' : '🚗 Get Directions'}
            </button>

            {/* Route Comparison */}
            {routes && (
              <div style={{ marginTop: '20px', paddingTop: '20px', borderTop: '1px solid #e0e0e0' }}>
                <h4 style={{ margin: '0 0 16px 0', fontSize: '13px', fontWeight: 700, color: '#222' }}>Route Options</h4>
                {selectedRoute && (
                  <div style={{ fontSize: '13px', color: '#666', lineHeight: '1.8', marginBottom: '12px', padding: '12px', background: '#f9f9f9', borderRadius: '8px' }}>
                    <div style={{ fontWeight: 700, marginBottom: '8px', color: '#222' }}>{selectedRoute === 'fastest' ? '⚡ Fastest' : '🛡️ Safe'} Route</div>
                    <div>📏 Distance: {selectedRoute === 'fastest' ? routes.fastestRoute.distance.toFixed(1) : routes.safeRoute.distance.toFixed(1)} km</div>
                    <div>⏱️ Duration: {selectedRoute === 'fastest' ? Math.round(routes.fastestRoute.duration) : Math.round(routes.safeRoute.duration)} min</div>
                    {selectedRoute === 'fastest' && routeRisks.fastest && (
                      <div style={{ marginTop: '8px' }}>Risk: {getRiskLevel(routeRisks.fastest.risk_score)} ({(routeRisks.fastest.risk_score * 100).toFixed(0)}%)</div>
                    )}
                    {selectedRoute === 'safe' && routeRisks.safe && (
                      <div style={{ marginTop: '8px' }}>Risk: {getRiskLevel(routeRisks.safe.risk_score)} ({(routeRisks.safe.risk_score * 100).toFixed(0)}%)</div>
                    )}
                  </div>
                )}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                  <button
                    onClick={() => setSelectedRoute('fastest')}
                    style={{
                      padding: '10px 12px',
                      fontSize: '12px',
                      background: selectedRoute === 'fastest' ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' : '#f0f0f0',
                      color: selectedRoute === 'fastest' ? 'white' : '#666',
                      border: 'none',
                      borderRadius: '8px',
                      cursor: 'pointer',
                      fontWeight: 600,
                      transition: 'all 0.2s'
                    }}
                  >
                    Fastest
                  </button>
                  <button
                    onClick={() => setSelectedRoute('safe')}
                    style={{
                      padding: '10px 12px',
                      fontSize: '12px',
                      background: selectedRoute === 'safe' ? 'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)' : '#f0f0f0',
                      color: selectedRoute === 'safe' ? 'white' : '#666',
                      border: 'none',
                      borderRadius: '8px',
                      cursor: 'pointer',
                      fontWeight: 600,
                      transition: 'all 0.2s'
                    }}
                  >
                    Safe
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Right Panel - Combined Map */}
          <div style={{ 
            borderRadius: '14px', 
            overflow: 'hidden', 
            border: '1px solid rgba(255,255,255,0.3)', 
            background: '#fff',
            boxShadow: '0 8px 32px rgba(0,0,0,0.15)'
          }}>
            <CombinedHeatmapRoute
              routes={routes}
              selectedRoute={selectedRoute}
              startCoords={startCoords}
              endCoords={endCoords}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
