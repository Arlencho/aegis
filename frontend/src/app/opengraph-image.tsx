import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt = "AEGIS — Treasury Risk Audit with AI Analysis";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          alignItems: "center",
          background: "linear-gradient(135deg, #0a0a0f 0%, #0d1117 40%, #101820 100%)",
          fontFamily: "system-ui, sans-serif",
          position: "relative",
          overflow: "hidden",
        }}
      >
        {/* Grid pattern overlay */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            opacity: 0.05,
            backgroundImage:
              "linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)",
            backgroundSize: "40px 40px",
          }}
        />

        {/* Glow effect */}
        <div
          style={{
            position: "absolute",
            top: "-200px",
            right: "-100px",
            width: "600px",
            height: "600px",
            borderRadius: "50%",
            background: "radial-gradient(circle, rgba(59,130,246,0.15) 0%, transparent 70%)",
            display: "flex",
          }}
        />

        {/* Shield icon */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            width: "80px",
            height: "80px",
            borderRadius: "20px",
            background: "linear-gradient(135deg, rgba(59,130,246,0.2), rgba(99,102,241,0.2))",
            border: "1px solid rgba(59,130,246,0.3)",
            marginBottom: "24px",
            fontSize: "40px",
          }}
        >
          🛡️
        </div>

        {/* Title */}
        <div
          style={{
            fontSize: "72px",
            fontWeight: 800,
            letterSpacing: "-2px",
            display: "flex",
            background: "linear-gradient(90deg, #ffffff 0%, #94a3b8 100%)",
            backgroundClip: "text",
            color: "transparent",
          }}
        >
          AEGIS
        </div>

        {/* Tagline */}
        <div
          style={{
            fontSize: "28px",
            fontWeight: 500,
            color: "#94a3b8",
            marginTop: "8px",
            display: "flex",
          }}
        >
          Treasury Risk Audit with AI Analysis
        </div>

        {/* Feature pills */}
        <div
          style={{
            display: "flex",
            gap: "12px",
            marginTop: "32px",
          }}
        >
          {["10 Compliance Rules", "AI Analysis", "PDF Reports", "Multi-Chain"].map(
            (label) => (
              <div
                key={label}
                style={{
                  display: "flex",
                  padding: "8px 20px",
                  borderRadius: "9999px",
                  background: "rgba(59,130,246,0.1)",
                  border: "1px solid rgba(59,130,246,0.25)",
                  color: "#60a5fa",
                  fontSize: "16px",
                  fontWeight: 500,
                }}
              >
                {label}
              </div>
            )
          )}
        </div>

        {/* Bottom URL */}
        <div
          style={{
            position: "absolute",
            bottom: "32px",
            display: "flex",
            color: "#475569",
            fontSize: "18px",
            fontWeight: 500,
          }}
        >
          aegistreasury.com
        </div>
      </div>
    ),
    { ...size }
  );
}
