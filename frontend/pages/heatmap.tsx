/* @ts-nocheck */
import { useEffect, useState, useRef } from "react";
import axios from "axios";
import Link from "next/link";
import dynamic from "next/dynamic";
import "leaflet/dist/leaflet.css";

const MapContainer = dynamic(
  () => import("react-leaflet").then((mod) => mod.MapContainer),
  { ssr: false }
);
const TileLayer = dynamic(
  () => import("react-leaflet").then((mod) => mod.TileLayer),
  { ssr: false }
);
const CircleMarker = dynamic(
  () => import("react-leaflet").then((mod) => mod.CircleMarker),
  { ssr: false }
);

interface HeatPoint {
  id: string;
  lat: number;
  lng: number;
  risk_score: number;
  event_count: number;
  concentration: number;
  speed_limit: number;
  avg_speed: number;
  exception_count: number;
  speed_excess_count: number;
  speed_deficit_count: number;
}

interface ClusterDetails extends HeatPoint {}

export default function Heatmap() {
  const [points, setPoints] = useState<HeatPoint[]>([]);
  const [center, setCenter] = useState<[number, number]>([43.6, -79.58]);
  const [zoom, setZoom] = useState(12);
  const [selectedCluster, setSelectedCluster] = useState<ClusterDetails | null>(null);
  const mapRef = useRef<any>(null);

  useEffect(() => {
    console.log("Fetching heatmap data...");
    axios
      .get<HeatPoint[]>("/api/heatmap", { timeout: 35000 })
      .then((r) => {
        console.log("Received data:", r.data);
        setPoints(r.data);
        
        // Calculate bounding box
        if (r.data.length > 0) {
          const lats = r.data.map((p) => p.lat);
          const lngs = r.data.map((p) => p.lng);
          
          const minLat = Math.min(...lats);
          const maxLat = Math.max(...lats);
          const minLng = Math.min(...lngs);
          const maxLng = Math.max(...lngs);
          
          // Calculate center
          const centerLat = (minLat + maxLat) / 2;
          const centerLng = (minLng + maxLng) / 2;
          setCenter([centerLat, centerLng]);
          
          // Calculate zoom based on spread
          const latSpan = maxLat - minLat;
          const lngSpan = maxLng - minLng;
          const maxSpan = Math.max(latSpan, lngSpan);
          
          // Rough zoom calculation (adjust as needed)
          let calculatedZoom = 12;
          if (maxSpan > 0.5) calculatedZoom = 11;
          if (maxSpan > 1) calculatedZoom = 10;
          if (maxSpan < 0.1) calculatedZoom = 14;
          
          setZoom(calculatedZoom);
          console.log("Map centered at", centerLat, centerLng, "zoom", calculatedZoom);
        }
      })
      .catch((error) => {
        console.error("Error fetching heatmap:", error);
      });
  }, []);

  const colorForRisk = (r: number) => {
    // Modern gradient: low risk (blue) → medium (cyan/green) → high risk (red/dark)
    if (r < 0.2) return "#3b82f6"; // Blue - minimal risk
    if (r < 0.4) return "#06b6d4"; // Cyan - low risk
    if (r < 0.6) return "#eab308"; // Yellow - medium risk
    if (r < 0.8) return "#f97316"; // Orange - high risk
    return "#dc2626"; // Red - critical risk
  };

  // Larger radius based on concentration and event count
  const radiusForCluster = (concentration: number, eventCount: number) => {
    // Base radius 20-120px based on concentration
    return 20 + concentration * 100;
  };

  // Opacity based on concentration intensity
  const opacityForCluster = (concentration: number) => {
    return 0.3 + concentration * 0.5; // 0.3 - 0.8
  };

  return (
    <div style={{ height: "100vh", width: "100%", position: "relative" }}>
      <header
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          padding: "12px 20px",
          background: "#ffffff",
          color: "#1f2937",
          zIndex: 1000,
          boxShadow: "0 2px 8px rgba(0, 0, 0, 0.1)",
          borderBottom: "1px solid #e5e7eb",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <div>
          <h1 style={{ margin: 0, fontSize: "1.5rem", fontWeight: 600, color: "#1f2937" }}>
            RouteIQ Heatmap
          </h1>
          <p style={{ margin: "4px 0 0 0", fontSize: "0.85rem", color: "#6b7280" }}>
            Fleet risk analysis & concentration zones
          </p>
        </div>
        <Link href="/">
          <button
            style={{
              padding: "8px 16px",
              background: "#f3f4f6",
              border: "1px solid #d1d5db",
              borderRadius: "6px",
              cursor: "pointer",
              fontSize: "0.9rem",
              fontWeight: 500,
              color: "#1f2937",
              transition: "all 0.2s",
            }}
            onMouseOver={(e) => {
              e.currentTarget.style.background = "#e5e7eb";
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.background = "#f3f4f6";
            }}
          >
            ← Back
          </button>
        </Link>
      </header>
      {(MapContainer as any) && (
        <MapContainer
          ref={mapRef}
          center={center}
          zoom={zoom}
          style={{ height: "100%" }}
        >
          <TileLayer
            url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
            attribution="&copy; CartoDB | &copy; OpenStreetMap contributors"
          />
          {points.map((p) => (
            <CircleMarker
              key={p.id}
              center={[p.lat, p.lng]}
              radius={radiusForCluster(p.concentration, p.event_count)}
              pathOptions={{
                color: colorForRisk(p.risk_score),
                fillOpacity: opacityForCluster(p.concentration),
                weight: 3,
                dashArray: "5, 5",
                lineCap: "round",
                lineJoin: "round",
              }}
              title={`Risk: ${(p.risk_score * 100).toFixed(0)}% | Events: ${p.event_count}`}
              eventHandlers={{
                click: () => setSelectedCluster(p),
              }}
            />
          ))}
        </MapContainer>
      )}
      <div
        style={{
          position: "absolute",
          bottom: 20,
          left: 20,
          padding: "16px",
          background: "#ffffff",
          borderRadius: "8px",
          fontSize: "0.9rem",
          zIndex: 1000,
          boxShadow: "0 4px 12px rgba(0, 0, 0, 0.15)",
          fontFamily: "'Inter', 'Segoe UI', sans-serif",
          border: "1px solid #e5e7eb",
        }}
      >
        <strong style={{ display: "block", marginBottom: 8, fontSize: "1rem", color: "#1f2937" }}>
          Risk Levels
        </strong>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div
              style={{
                width: 16,
                height: 16,
                borderRadius: "50%",
                background: "#3b82f6",
                border: "2px solid #1f2937",
              }}
            />
            <span style={{ color: "#1f2937" }}>Low (0-20%)</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div
              style={{
                width: 16,
                height: 16,
                borderRadius: "50%",
                background: "#06b6d4",
                border: "2px solid #1f2937",
              }}
            />
            <span style={{ color: "#1f2937" }}>Low-Medium (20-40%)</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div
              style={{
                width: 16,
                height: 16,
                borderRadius: "50%",
                background: "#eab308",
                border: "2px solid #1f2937",
              }}
            />
            <span style={{ color: "#1f2937" }}>Medium (40-60%)</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div
              style={{
                width: 16,
                height: 16,
                borderRadius: "50%",
                background: "#f97316",
                border: "2px solid #1f2937",
              }}
            />
            <span style={{ color: "#1f2937" }}>High (60-80%)</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div
              style={{
                width: 16,
                height: 16,
                borderRadius: "50%",
                background: "#dc2626",
                border: "2px solid #1f2937",
              }}
            />
            <span style={{ color: "#1f2937" }}>Critical (80%+)</span>
          </div>
        </div>
      </div>

      {/* Cluster Details Modal */}
      {selectedCluster && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: "rgba(0, 0, 0, 0.5)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 2000,
          }}
          onClick={() => setSelectedCluster(null)}
        >
          <div
            style={{
              background: "#ffffff",
              borderRadius: "12px",
              padding: "24px",
              maxWidth: "500px",
              width: "90%",
              boxShadow: "0 20px 60px rgba(0, 0, 0, 0.3)",
              maxHeight: "80vh",
              overflowY: "auto",
              fontFamily: "'Inter', 'Segoe UI', sans-serif",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: "20px",
              }}
            >
              <h2 style={{ margin: 0, fontSize: "1.5rem", color: "#1f2937" }}>
                Cluster Details
              </h2>
              <button
                onClick={() => setSelectedCluster(null)}
                style={{
                  background: "none",
                  border: "none",
                  fontSize: "1.5rem",
                  cursor: "pointer",
                  color: "#6b7280",
                }}
              >
                ×
              </button>
            </div>

            {/* Location */}
            <div style={{ marginBottom: "20px", paddingBottom: "16px", borderBottom: "1px solid #e5e7eb" }}>
              <p style={{ margin: "0 0 8px 0", fontSize: "0.85rem", color: "#6b7280", fontWeight: 600 }}>
                LOCATION
              </p>
              <p style={{ margin: 0, fontSize: "1rem", color: "#1f2937" }}>
                {selectedCluster.lat.toFixed(4)}, {selectedCluster.lng.toFixed(4)}
              </p>
            </div>

            {/* Risk Score */}
            <div style={{ marginBottom: "20px", paddingBottom: "16px", borderBottom: "1px solid #e5e7eb" }}>
              <p style={{ margin: "0 0 8px 0", fontSize: "0.85rem", color: "#6b7280", fontWeight: 600 }}>
                RISK SCORE
              </p>
              <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                <div
                  style={{
                    width: "40px",
                    height: "40px",
                    borderRadius: "50%",
                    background: colorForRisk(selectedCluster.risk_score),
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "#ffffff",
                    fontWeight: 700,
                    fontSize: "0.9rem",
                  }}
                >
                  {(selectedCluster.risk_score * 100).toFixed(0)}%
                </div>
                <span style={{ color: "#1f2937", fontSize: "1rem" }}>
                  {selectedCluster.risk_score < 0.2 && "Low Risk"}
                  {selectedCluster.risk_score >= 0.2 && selectedCluster.risk_score < 0.4 && "Low-Medium Risk"}
                  {selectedCluster.risk_score >= 0.4 && selectedCluster.risk_score < 0.6 && "Medium Risk"}
                  {selectedCluster.risk_score >= 0.6 && selectedCluster.risk_score < 0.8 && "High Risk"}
                  {selectedCluster.risk_score >= 0.8 && "Critical Risk"}
                </span>
              </div>
            </div>

            {/* Speed Data */}
            <div style={{ marginBottom: "20px", paddingBottom: "16px", borderBottom: "1px solid #e5e7eb" }}>
              <p style={{ margin: "0 0 12px 0", fontSize: "0.85rem", color: "#6b7280", fontWeight: 600 }}>
                SPEED DATA
              </p>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                <div style={{ background: "#f9fafb", padding: "12px", borderRadius: "6px" }}>
                  <p style={{ margin: "0 0 4px 0", fontSize: "0.75rem", color: "#6b7280" }}>Speed Limit</p>
                  <p style={{ margin: 0, fontSize: "1.1rem", fontWeight: 600, color: "#1f2937" }}>
                    {selectedCluster.speed_limit} km/h
                  </p>
                </div>
                <div style={{ background: "#f9fafb", padding: "12px", borderRadius: "6px" }}>
                  <p style={{ margin: "0 0 4px 0", fontSize: "0.75rem", color: "#6b7280" }}>Average Speed</p>
                  <p style={{ margin: 0, fontSize: "1.1rem", fontWeight: 600, color: "#1f2937" }}>
                    {selectedCluster.avg_speed.toFixed(1)} km/h
                  </p>
                </div>
              </div>
              <div style={{ marginTop: "12px", padding: "12px", background: "#fef2f2", borderRadius: "6px", borderLeft: "4px solid #dc2626" }}>
                <p style={{ margin: "0 0 6px 0", fontSize: "0.75rem", color: "#991b1b", fontWeight: 600 }}>
                  Speed Deviations
                </p>
                <p style={{ margin: "0 0 4px 0", fontSize: "0.9rem", color: "#1f2937" }}>
                  ↑ {Math.abs(Math.round(selectedCluster.avg_speed - selectedCluster.speed_limit))} km/h from limit
                </p>
                <p style={{ margin: 0, fontSize: "0.75rem", color: "#6b7280" }}>
                  Threshold: ±12 km/h tolerance
                </p>
              </div>
            </div>

            {/* Violations */}
            <div style={{ marginBottom: "20px", paddingBottom: "16px", borderBottom: "1px solid #e5e7eb" }}>
              <p style={{ margin: "0 0 12px 0", fontSize: "0.85rem", color: "#6b7280", fontWeight: 600 }}>
                EVENTS & VIOLATIONS
              </p>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "12px" }}>
                <div style={{ background: "#f9fafb", padding: "12px", borderRadius: "6px" }}>
                  <p style={{ margin: "0 0 4px 0", fontSize: "0.75rem", color: "#6b7280" }}>Total Events</p>
                  <p style={{ margin: 0, fontSize: "1.1rem", fontWeight: 600, color: "#1f2937" }}>
                    {selectedCluster.event_count}
                  </p>
                </div>
                <div style={{ background: "#f9fafb", padding: "12px", borderRadius: "6px" }}>
                  <p style={{ margin: "0 0 4px 0", fontSize: "0.75rem", color: "#6b7280" }}>Violations</p>
                  <p style={{ margin: 0, fontSize: "1.1rem", fontWeight: 600, color: "#dc2626" }}>
                    {selectedCluster.exception_count}
                  </p>
                </div>
                <div style={{ background: "#f9fafb", padding: "12px", borderRadius: "6px" }}>
                  <p style={{ margin: "0 0 4px 0", fontSize: "0.75rem", color: "#6b7280" }}>Density</p>
                  <p style={{ margin: 0, fontSize: "1.1rem", fontWeight: 600, color: "#1f2937" }}>
                    {(selectedCluster.concentration * 100).toFixed(0)}%
                  </p>
                </div>
              </div>
            </div>

            {/* Close Button */}
            <button
              onClick={() => setSelectedCluster(null)}
              style={{
                width: "100%",
                padding: "12px",
                background: "#3b82f6",
                color: "#ffffff",
                border: "none",
                borderRadius: "6px",
                fontSize: "0.95rem",
                fontWeight: 600,
                cursor: "pointer",
                transition: "background 0.2s",
              }}
              onMouseOver={(e) => (e.currentTarget.style.background = "#2563eb")}
              onMouseOut={(e) => (e.currentTarget.style.background = "#3b82f6")}
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
