import React, { useState, useEffect } from 'react';
import styles from '../styles/routing.module.css';
import Link from 'next/link';
import dynamic from 'next/dynamic';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

// Dynamically import map component (for SSR compatibility)
const RouteMap = dynamic(() => import('../components/RouteMap'), {
  ssr: false,
  loading: () => <div className={styles.mapLoading}>Loading map...</div>,
});

export default function Routing() {
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

  // Fetch vehicles on mount
  useEffect(() => {
    fetchVehicles();
  }, []);

  const fetchVehicles = async () => {
    try {
      const url = `${API_URL}/api/vehicles`;
      console.log('Fetching vehicles from:', url);
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
        },
      });
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const data = await response.json();
      console.log('Vehicles fetched successfully:', data.length);
      setVehicles(Array.isArray(data) ? data : []);
      setError(null);
    } catch (err) {
      console.error('Error fetching vehicles:', err.message);
      setError(`Failed to load vehicles: ${err.message}`);
      setVehicles([]);
    }
  };

  // Get address suggestions from Nominatim
  const getAddressSuggestions = async (query) => {
    if (!query || query.length < 2) return [];

    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=5`,
        {
          headers: {
            'User-Agent': 'RouteIQ/1.0',
          },
        }
      );

      if (!response.ok) return [];
      const data = await response.json();
      return data.map(item => ({
        display_name: item.display_name,
        latitude: parseFloat(item.lat),
        longitude: parseFloat(item.lon),
      }));
    } catch (err) {
      console.error('Error fetching suggestions:', err);
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
    setError(null);
  };

  const selectEndSuggestion = (suggestion) => {
    setEndAddress(suggestion.display_name);
    setEndCoords(suggestion);
    setShowEndSuggestions(false);
    setError(null);
  };

  const handleUseVehicleLocation = async (vehicleId) => {
    try {
      const response = await fetch(`${API_URL}/api/vehicle/${vehicleId}`, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
        },
      });

      if (!response.ok) throw new Error('Failed to fetch vehicle data');
      const data = await response.json();

      const vehicle = vehicles.find(v => v.id === vehicleId);
      const latitude = data.dashboard?.latitude;
      const longitude = data.dashboard?.longitude;

      if (latitude && longitude) {
        setStartCoords({
          latitude,
          longitude,
          address: `${vehicle?.name || 'Vehicle'} (${latitude.toFixed(4)}, ${longitude.toFixed(4)})`
        });
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
      const response = await fetch(`${API_URL}/api/route/calculate?start_lat=${startCoords.latitude}&start_lng=${startCoords.longitude}&end_lat=${endCoords.latitude}&end_lng=${endCoords.longitude}`, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
        },
      });

      if (!response.ok) throw new Error('Failed to calculate route');
      const data = await response.json();

      if (data.error) {
        setError(`Route calculation error: ${data.error}`);
        setLoading(false);
        return;
      }

      setRoutes(data);

      // Calculate risk scores for both routes
      const risks = {};
      risks.fastest = await calculateRiskScore('fastest');
      risks.safe = await calculateRiskScore('safe');
      setRouteRisks(risks);

      setSelectedRoute('fastest'); // Default to fastest
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
        headers: {
          'Accept': 'application/json',
        },
      });

      if (!response.ok) throw new Error('Failed to calculate risk');
      return await response.json();
    } catch (err) {
      console.error(`Failed to calculate risk for ${routeType}:`, err);
      return { risk_score: 0.5, risk_level: 'Unknown' };
    }
  };

  const getRiskColor = (riskScore) => {
    if (riskScore < 0.3) return '#4CAF50'; // Green
    if (riskScore < 0.6) return '#FFC107'; // Yellow
    return '#F44336'; // Red
  };

  const getRiskLevel = (riskScore) => {
    if (riskScore < 0.3) return 'Low';
    if (riskScore < 0.6) return 'Moderate';
    return 'High';
  };

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <h1>Route Planning</h1>
        <p>Find the fastest or safest route with real-time incident analysis</p>
        <nav className={styles.nav}>
          <Link href="/">Dashboard</Link>
          <Link href="/risk-analysis">Risk Analysis</Link>
          <Link href="/heatmap">Map</Link>
        </nav>
      </header>

      <div className={styles.content}>
        {/* Route Input Panel */}
        <section className={styles.inputPanel}>
          <h2>Route Information</h2>

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
                <label>Or select vehicle location:</label>
                <div className={styles.vehicleGrid}>
                  {vehicles.slice(0, 5).map(vehicle => (
                    <button
                      key={vehicle.id}
                      className={`${styles.vehicleButton} ${selectedVehicle === vehicle.id ? styles.active : ''}`}
                      onClick={() => handleUseVehicleLocation(vehicle.id)}
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

          {/* Error Message */}
          {error && <div className={styles.error}>{error}</div>}

          {/* Calculate Button */}
          <button
            onClick={calculateRoute}
            disabled={loading || !startCoords || !endCoords}
            className={styles.calculateButton}
          >
            {loading ? 'Calculating Routes...' : 'Get Directions'}
          </button>
        </section>

        {/* Route Comparison */}
        {routes && (
          <section className={styles.routeComparison}>
            <h2>Route Options</h2>

            <div className={styles.routeOptions}>
              {/* Fastest Route */}
              <div
                className={`${styles.routeCard} ${selectedRoute === 'fastest' ? styles.selected : ''}`}
                onClick={() => setSelectedRoute('fastest')}
              >
                <div className={styles.routeTitle}>
                  <h3>⚡ Fastest Route</h3>
                </div>

                <div className={styles.routeMetrics}>
                  <div className={styles.metric}>
                    <span className={styles.label}>Duration:</span>
                    <span className={styles.value}>
                      {Math.round(routes.fastestRoute.duration)} min
                    </span>
                  </div>
                  <div className={styles.metric}>
                    <span className={styles.label}>Distance:</span>
                    <span className={styles.value}>
                      {routes.fastestRoute.distance.toFixed(1)} km
                    </span>
                  </div>
                </div>

                {routeRisks.fastest && (
                  <div className={styles.riskScore}>
                    <div
                      className={styles.riskBar}
                      style={{
                        backgroundColor: getRiskColor(routeRisks.fastest.risk_score),
                        width: `${routeRisks.fastest.risk_score * 100}%`
                      }}
                    />
                    <span className={styles.riskLabel}>
                      Risk Level: {getRiskLevel(routeRisks.fastest.risk_score)}
                      ({(routeRisks.fastest.risk_score * 100).toFixed(0)}%)
                    </span>
                  </div>
                )}

                <div className={styles.routeDetails}>
                  <p>Estimated time based on current conditions and incident hotspots</p>
                </div>

                <button className={styles.selectButton}>
                  {selectedRoute === 'fastest' ? '✓ Selected' : 'Select Route'}
                </button>
              </div>

              {/* Safe Route */}
              <div
                className={`${styles.routeCard} ${selectedRoute === 'safe' ? styles.selected : ''}`}
                onClick={() => setSelectedRoute('safe')}
              >
                <div className={styles.routeTitle}>
                  <h3>🛡️ Safest Route</h3>
                </div>

                <div className={styles.routeMetrics}>
                  <div className={styles.metric}>
                    <span className={styles.label}>Duration:</span>
                    <span className={styles.value}>
                      {Math.round(routes.safeRoute.duration)} min
                    </span>
                  </div>
                  <div className={styles.metric}>
                    <span className={styles.label}>Distance:</span>
                    <span className={styles.value}>
                      {routes.safeRoute.distance.toFixed(1)} km
                    </span>
                  </div>
                </div>

                {routeRisks.safe && (
                  <div className={styles.riskScore}>
                    <div
                      className={styles.riskBar}
                      style={{
                        backgroundColor: getRiskColor(routeRisks.safe.risk_score),
                        width: `${routeRisks.safe.risk_score * 100}%`
                      }}
                    />
                    <span className={styles.riskLabel}>
                      Risk Level: {getRiskLevel(routeRisks.safe.risk_score)}
                      ({(routeRisks.safe.risk_score * 100).toFixed(0)}%)
                    </span>
                  </div>
                )}

                <div className={styles.routeDetails}>
                  <p>Optimized to avoid incident hotspots and high-risk areas</p>
                </div>

                <button className={styles.selectButton}>
                  {selectedRoute === 'safe' ? '✓ Selected' : 'Select Route'}
                </button>
              </div>
            </div>

            {/* Selected Route Details */}
            {selectedRoute && (
              <div className={styles.selectedRouteInfo}>
                <h3>
                  {selectedRoute === 'fastest' ? 'Fastest Route Selected' : 'Safest Route Selected'}
                </h3>
                <p>
                  {selectedRoute === 'fastest'
                    ? 'This route prioritizes speed and direct path to destination.'
                    : 'This route avoids known incident hotspots and high-risk driving areas.'}
                </p>
                <div className={styles.routeStats}>
                  {selectedRoute === 'fastest' ? (
                    <>
                      <div>Total Distance: {routes.fastestRoute.distance.toFixed(1)} km</div>
                      <div>Estimated Duration: {Math.round(routes.fastestRoute.duration)} minutes</div>
                      {routeRisks.fastest && <div>Risk Score: {(routeRisks.fastest.risk_score * 100).toFixed(1)}%</div>}
                    </>
                  ) : (
                    <>
                      <div>Total Distance: {routes.safeRoute.distance.toFixed(1)} km</div>
                      <div>Estimated Duration: {Math.round(routes.safeRoute.duration)} minutes</div>
                      {routeRisks.safe && <div>Risk Score: {(routeRisks.safe.risk_score * 100).toFixed(1)}%</div>}
                    </>
                  )}
                </div>
              </div>
            )}
          </section>
        )}

        {/* Map Display */}
        {routes && startCoords && endCoords && (
          <section className={styles.mapSection}>
            <h2>Route Map</h2>
            <RouteMap
              startCoords={startCoords}
              endCoords={endCoords}
              selectedRoute={selectedRoute}
              routes={routes}
            />
          </section>
        )}

        {/* Instructions */}
        {!routes && (
          <section className={styles.instructions}>
            <h2>How to Use</h2>
            <ol>
              <li>Enter a starting address or select a vehicle location</li>
              <li>Enter a destination address</li>
              <li>Click "Get Directions" to calculate routes</li>
              <li>Compare the fastest and safest options</li>
              <li>Select your preferred route</li>
            </ol>
            <p>
              The <strong>Fastest Route</strong> prioritizes speed and shortest travel time.
            </p>
            <p>
              The <strong>Safest Route</strong> avoids incident hotspots where high-risk driving events have been detected.
            </p>
          </section>
        )}
      </div>
    </div>
  );
}
