
import React, { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import Head from 'next/head';
import Navbar from '../components/Navbar';
import Link from 'next/link';
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
    if (value.length > 1) {
      const suggestions = await getAddressSuggestions(value);
      setStartAddressSuggestions(suggestions);
      setShowStartSuggestions(suggestions.length > 0);
    } else {
      setShowStartSuggestions(false);
    }
  };

  const handleEndAddressChange = async (e) => {
    const value = e.target.value;
    setEndAddress(value);
    if (value.length > 1) {
      const suggestions = await getAddressSuggestions(value);
      setEndAddressSuggestions(suggestions);
      setShowEndSuggestions(suggestions.length > 0);
    } else {
      setShowEndSuggestions(false);
    }
  };

  const selectStartSuggestion = (suggestion) => {
    setStartAddress(suggestion.display_name);
    setStartCoords(suggestion);
    setShowStartSuggestions(false);
  };

  const selectEndSuggestion = (suggestion) => {
    setEndAddress(suggestion.display_name);
    setEndCoords(suggestion);
    setShowEndSuggestions(false);
  };

  const handleUseVehicleLocation = async (vehicleId) => {
    try {
      const response = await fetch(`${API_URL}/api/vehicle/${vehicleId}`, {
        method: 'GET',
        headers: { 'Accept': 'application/json' },
      });
      if (!response.ok) throw new Error('Failed to fetch vehicle location');
      const data = await response.json();
      const position = data.dashboard?.lastReportedPosition;
      if (position) {
        setStartCoords({
          latitude: position.latitude,
          longitude: position.longitude,
          display_name: `${data.name} (${position.latitude.toFixed(4)}, ${position.longitude.toFixed(4)})`,
        });
        setStartAddress(`${data.name} Location`);
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
    <div style={{ minHeight: '100vh', background: '#f7f8fa', fontFamily: 'Poppins, Inter, Arial, sans-serif', display: 'flex', flexDirection: 'column' }}>
      <Navbar />
      <Head>
        <title>Toronto Risk Heatmap & Routing</title>
        <meta name="description" content="Heatmap with integrated route planning" />
      </Head>

      <header className={styles.header}>
        <h1>Heatmap & Route Planning</h1>
        <p>View risk areas and calculate safe routes</p>
        <nav className={styles.nav}>
          <Link href="/">Dashboard</Link>
          <Link href="/risk-analysis">Risk Analysis</Link>
          <Link href="/routing">Routing</Link>
        </nav>
      </header>

      <main style={{ maxWidth: 1400, margin: '0 auto', padding: '2rem', width: '100%' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '2rem' }}>
          {/* Left Panel - Routing Controls */}
          <section className={styles.inputPanel} style={{ height: 'fit-content' }}>
            <h2>Calculate Route</h2>

            {/* Start Point */}
            <div className={styles.inputGroup}>
              <label htmlFor="startAddress">Start Point</label>
              <div className={styles.autoCompleteContainer}>
                <input
                  id="startAddress"
                  type="text"
                  placeholder="Enter starting address"
                  value={startAddress}
                  onChange={handleStartAddressChange}
                  onFocus={() => showStartSuggestions && setShowStartSuggestions(true)}
                  className={styles.input}
                />
                {showStartSuggestions && startAddressSuggestions.length > 0 && (
                  <div className={styles.suggestionsList}>
                    {startAddressSuggestions.map((suggestion, idx) => (
                      <div
                        key={idx}
                        className={styles.suggestionItem}
                        onClick={() => selectStartSuggestion(suggestion)}
                      >
                        <div className={styles.suggestionText}>{suggestion.display_name}</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              {startCoords && (
                <div className={styles.geocodedInfo}>
                  ✓ {startCoords.display_name || `${startCoords.latitude.toFixed(4)}, ${startCoords.longitude.toFixed(4)}`}
                </div>
              )}
              {vehicles.length > 0 && (
                <div className={styles.vehicleSelector}>
                  <label>Or select vehicle:</label>
                  <div className={styles.vehicleGrid}>
                    {vehicles.slice(0, 3).map(vehicle => (
                      <button
                        key={vehicle.id}
                        className={`${styles.vehicleButton} ${selectedVehicle === vehicle.id ? styles.active : ''}`}
                        onClick={() => handleUseVehicleLocation(vehicle.id)}
                        style={{ fontSize: '12px' }}
                      >
                        {vehicle.name}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* End Point */}
            <div className={styles.inputGroup}>
              <label htmlFor="endAddress">Destination</label>
              <div className={styles.autoCompleteContainer}>
                <input
                  id="endAddress"
                  type="text"
                  placeholder="Enter destination address"
                  value={endAddress}
                  onChange={handleEndAddressChange}
                  onFocus={() => showEndSuggestions && setShowEndSuggestions(true)}
                  className={styles.input}
                />
                {showEndSuggestions && endAddressSuggestions.length > 0 && (
                  <div className={styles.suggestionsList}>
                    {endAddressSuggestions.map((suggestion, idx) => (
                      <div
                        key={idx}
                        className={styles.suggestionItem}
                        onClick={() => selectEndSuggestion(suggestion)}
                      >
                        <div className={styles.suggestionText}>{suggestion.display_name}</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              {endCoords && (
                <div className={styles.geocodedInfo}>
                  ✓ {endCoords.display_name || `${endCoords.latitude.toFixed(4)}, ${endCoords.longitude.toFixed(4)}`}
                </div>
              )}
            </div>

            {error && <div className={styles.error}>{error}</div>}

            <button
              onClick={calculateRoute}
              disabled={loading || !startCoords || !endCoords}
              className={styles.calculateButton}
            >
              {loading ? 'Calculating...' : 'Get Directions'}
            </button>

            {/* Route Comparison */}
            {routes && (
              <div style={{ marginTop: '2rem', paddingTop: '2rem', borderTop: '1px solid #eee' }}>
                <h3 style={{ marginBottom: '1rem' }}>Route Options</h3>
                {selectedRoute && (
                  <div style={{ fontSize: '13px', color: '#666', lineHeight: '1.6' }}>
                    <strong>{selectedRoute === 'fastest' ? '⚡ Fastest' : '🛡️ Safe'} Route</strong>
                    <div>Distance: {selectedRoute === 'fastest' ? routes.fastestRoute.distance.toFixed(1) : routes.safeRoute.distance.toFixed(1)} km</div>
                    <div>Duration: {selectedRoute === 'fastest' ? Math.round(routes.fastestRoute.duration) : Math.round(routes.safeRoute.duration)} min</div>
                    {selectedRoute === 'fastest' && routeRisks.fastest && (
                      <div style={{ marginTop: '0.5rem' }}>
                        Risk: {getRiskLevel(routeRisks.fastest.risk_score)} ({(routeRisks.fastest.risk_score * 100).toFixed(0)}%)
                      </div>
                    )}
                    {selectedRoute === 'safe' && routeRisks.safe && (
                      <div style={{ marginTop: '0.5rem' }}>
                        Risk: {getRiskLevel(routeRisks.safe.risk_score)} ({(routeRisks.safe.risk_score * 100).toFixed(0)}%)
                      </div>
                    )}
                  </div>
                )}
                <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1rem' }}>
                  <button
                    onClick={() => setSelectedRoute('fastest')}
                    style={{
                      padding: '0.5rem 1rem',
                      fontSize: '12px',
                      background: selectedRoute === 'fastest' ? '#1976d2' : '#ddd',
                      color: selectedRoute === 'fastest' ? 'white' : '#666',
                      border: 'none',
                      borderRadius: '4px',
                      cursor: 'pointer',
                      flex: 1,
                    }}
                  >
                    Fastest
                  </button>
                  <button
                    onClick={() => setSelectedRoute('safe')}
                    style={{
                      padding: '0.5rem 1rem',
                      fontSize: '12px',
                      background: selectedRoute === 'safe' ? '#43a047' : '#ddd',
                      color: selectedRoute === 'safe' ? 'white' : '#666',
                      border: 'none',
                      borderRadius: '4px',
                      cursor: 'pointer',
                      flex: 1,
                    }}
                  >
                    Safe
                  </button>
                </div>
              </div>
            )}
          </section>

          {/* Right Panel - Combined Map */}
          <div style={{ borderRadius: '8px', overflow: 'hidden', border: '1px solid #ddd', background: 'white' }}>
            <CombinedHeatmapRoute
              routes={routes}
              selectedRoute={selectedRoute}
              startCoords={startCoords}
              endCoords={endCoords}
            />
          </div>
        </div>
      </main>
    </div>
  );
}
