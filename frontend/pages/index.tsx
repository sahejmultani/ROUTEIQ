import { useEffect, useState, useRef } from "react";
import dynamic from "next/dynamic";
import axios from "axios";
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

export default function Home() {
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
    if (r < 0.33) return "green";
    if (r < 0.66) return "yellow";
    return "red";
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
          padding: "8px 16px",
          background: "rgba(0,0,0,0.6)",
          color: "white",
          zIndex: 1000,
        }}
      >
        <h1 style={{ margin: 0, fontSize: "1.2rem" }}>RouteIQ Heatmap</h1>
      </header>
      <MapContainer ref={mapRef} center={center} zoom={zoom} style={{ height: "100%" }}>
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution="&copy; OpenStreetMap contributors"
        />
        {points.map((p) => (
          <CircleMarker
            key={p.id}
            center={[p.lat, p.lng]}
            radius={radiusForCluster(p.concentration, p.event_count)}
            pathOptions={{
              color: colorForRisk(p.risk_score),
              fillOpacity: opacityForCluster(p.concentration),
              weight: 2,
              dashArray: "5, 5",
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
          padding: "8px 12px",
          background: "rgba(255,255,255,0.8)",
          borderRadius: 4,
          fontSize: "0.9rem",
          zIndex: 1000,
        }}
      >
        <strong>Legend:</strong>
        <div style={{ display: "flex", gap: 8, marginTop: 4 }}>
          <span style={{ color: "green" }}>Low risk</span>
          <span style={{ color: "yellow" }}>Medium risk</span>
          <span style={{ color: "red" }}>High risk</span>
        </div>
      </div>
    </div>
  );
}
