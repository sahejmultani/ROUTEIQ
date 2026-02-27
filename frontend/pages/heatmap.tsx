import { useEffect, useState, useRef } from "react";
import dynamic from "next/dynamic";
import axios from "axios";
import Link from "next/link";
import "leaflet/dist/leaflet.css";

// react-leaflet must be dynamically imported because it uses window
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
}

export default function Heatmap() {
  const [points, setPoints] = useState<HeatPoint[]>([]);
  const [center, setCenter] = useState<[number, number]>([43.6, -79.58]);
  const [zoom, setZoom] = useState(12);
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
      <MapContainer ref={mapRef} center={center} zoom={zoom} style={{ height: "100%" }}>
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
          />
        ))}
      </MapContainer>
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
    </div>
  );
}
