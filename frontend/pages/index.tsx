import { useEffect, useState } from "react";
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
}

export default function Home() {
  const [points, setPoints] = useState<HeatPoint[]>([]);

  useEffect(() => {
    axios
      .get<HeatPoint[]>("/api/heatmap")
      .then((r) => setPoints(r.data))
      .catch(console.error);
  }, []);

  const colorForRisk = (r: number) => {
    if (r < 0.33) return "green";
    if (r < 0.66) return "yellow";
    return "red";
  };

  const radiusForRisk = (r: number) => 5 + r * 15;

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
      <MapContainer center={[37.77, -122.42]} zoom={12} style={{ height: "100%" }}>
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution="&copy; OpenStreetMap contributors"
        />
        {points.map((p) => (
          <CircleMarker
            key={p.id}
            center={[p.lat, p.lng]}
            radius={radiusForRisk(p.risk_score)}
            pathOptions={{ color: colorForRisk(p.risk_score), fillOpacity: 0.5 }}
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
