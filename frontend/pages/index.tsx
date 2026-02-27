import Link from "next/link";

export default function Home() {
  return (
    <div
      style={{
        height: "100vh",
        width: "100%",
        background: "linear-gradient(135deg, #ffffff 0%, #f9fafb 100%)",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        fontFamily: "'Inter', 'Segoe UI', -apple-system, sans-serif",
        overflow: "hidden",
      }}
    >
      {/* Background accent */}
      <div
        style={{
          position: "absolute",
          top: "-100px",
          right: "-100px",
          width: "400px",
          height: "400px",
          background: "radial-gradient(circle, rgba(59, 130, 246, 0.1) 0%, transparent 70%)",
          borderRadius: "50%",
          pointerEvents: "none",
        }}
      />
      <div
        style={{
          position: "absolute",
          bottom: "-50px",
          left: "-50px",
          width: "300px",
          height: "300px",
          background: "radial-gradient(circle, rgba(6, 182, 212, 0.1) 0%, transparent 70%)",
          borderRadius: "50%",
          pointerEvents: "none",
        }}
      />

      {/* Main content */}
      <div style={{ position: "relative", zIndex: 10, textAlign: "center", maxWidth: "600px", padding: "40px 20px" }}>
        <h1
          style={{
            fontSize: "3.5rem",
            fontWeight: 700,
            color: "#1f2937",
            margin: "0 0 16px 0",
            letterSpacing: "-0.02em",
          }}
        >
          RouteIQ
        </h1>

        <p
          style={{
            fontSize: "1.25rem",
            color: "#6b7280",
            margin: "0 0 32px 0",
            fontWeight: 400,
            lineHeight: "1.6",
          }}
        >
          Real-time fleet management with AI-powered risk analysis. Identify high-risk zones and driver behavior patterns at a glance.
        </p>

        {/* Features list */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: "16px",
            margin: "40px 0",
            textAlign: "left",
          }}
        >
          <div
            style={{
              padding: "16px",
              background: "#ffffff",
              borderRadius: "8px",
              border: "1px solid #e5e7eb",
              boxShadow: "0 1px 3px rgba(0, 0, 0, 0.05)",
            }}
          >
            <div style={{ fontSize: "1.5rem", marginBottom: "8px" }}>🗺️</div>
            <div style={{ fontWeight: 600, color: "#1f2937", marginBottom: "4px" }}>Risk Heatmap</div>
            <div style={{ fontSize: "0.85rem", color: "#6b7280" }}>Visual concentration of high-risk areas</div>
          </div>

          <div
            style={{
              padding: "16px",
              background: "#ffffff",
              borderRadius: "8px",
              border: "1px solid #e5e7eb",
              boxShadow: "0 1px 3px rgba(0, 0, 0, 0.05)",
            }}
          >
            <div style={{ fontSize: "1.5rem", marginBottom: "8px" }}>📊</div>
            <div style={{ fontWeight: 600, color: "#1f2937", marginBottom: "4px" }}>Real-time Data</div>
            <div style={{ fontSize: "0.85rem", color: "#6b7280" }}>Live fleet tracking & analysis</div>
          </div>

          <div
            style={{
              padding: "16px",
              background: "#ffffff",
              borderRadius: "8px",
              border: "1px solid #e5e7eb",
              boxShadow: "0 1px 3px rgba(0, 0, 0, 0.05)",
            }}
          >
            <div style={{ fontSize: "1.5rem", marginBottom: "8px" }}>⚡</div>
            <div style={{ fontWeight: 600, color: "#1f2937", marginBottom: "4px" }}>Speed Violations</div>
            <div style={{ fontSize: "0.85rem", color: "#6b7280" }}>Track over & under-speed incidents</div>
          </div>

          <div
            style={{
              padding: "16px",
              background: "#ffffff",
              borderRadius: "8px",
              border: "1px solid #e5e7eb",
              boxShadow: "0 1px 3px rgba(0, 0, 0, 0.05)",
            }}
          >
            <div style={{ fontSize: "1.5rem", marginBottom: "8px" }}>🎯</div>
            <div style={{ fontWeight: 600, color: "#1f2937", marginBottom: "4px" }}>Driver Behavior</div>
            <div style={{ fontSize: "0.85rem", color: "#6b7280" }}>Aggressive braking & risky maneuvers</div>
          </div>
        </div>

        {/* CTA Button */}
        <Link href="/heatmap" style={{ textDecoration: "none" }}>
          <button
            style={{
              padding: "16px 40px",
              background: "linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)",
              color: "#ffffff",
              border: "none",
              borderRadius: "8px",
              fontSize: "1.1rem",
              fontWeight: 600,
              cursor: "pointer",
              transition: "all 0.3s ease",
              boxShadow: "0 4px 15px rgba(59, 130, 246, 0.3)",
              marginTop: "12px",
            }}
            onMouseOver={(e) => {
              e.currentTarget.style.transform = "translateY(-2px)";
              e.currentTarget.style.boxShadow = "0 6px 20px rgba(59, 130, 246, 0.4)";
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.transform = "translateY(0)";
              e.currentTarget.style.boxShadow = "0 4px 15px rgba(59, 130, 246, 0.3)";
            }}
          >
            View Heatmap →
          </button>
        </Link>

        <p style={{ fontSize: "0.85rem", color: "#9ca3af", marginTop: "24px" }}>
          Powered by Geotab Real-time Intelligence
        </p>
      </div>
    </div>
  );
}
