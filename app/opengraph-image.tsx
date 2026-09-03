import { ImageResponse } from "next/og";
import { SITE_TAGLINE } from "@/lib/site";

export const alt = "Sponsas — Sponsorship made simple";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const NAVY = "#0a0f1c";
const BEGE = "#f4f3ef";
const ORANGE = "#ff5a1f";

export default function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          background: NAVY,
          padding: 80,
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ display: "flex", fontSize: 44, fontWeight: 700 }}>
          <span style={{ color: BEGE }}>Spons</span>
          <span style={{ color: ORANGE }}>as</span>
        </div>

        <div style={{ display: "flex", flexDirection: "column" }}>
          <div
            style={{
              display: "flex",
              color: BEGE,
              fontSize: 76,
              fontWeight: 700,
              lineHeight: 1.1,
              letterSpacing: -1,
            }}
          >
            Patrocínio sem mensagem no escuro.
          </div>
          <div
            style={{
              display: "flex",
              color: "rgba(244,243,239,0.6)",
              fontSize: 34,
              marginTop: 24,
            }}
          >
            Pilotos de arrancada e marcas, num só lugar.
          </div>
        </div>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 16,
            color: BEGE,
            fontSize: 28,
          }}
        >
          <div
            style={{
              display: "flex",
              width: 14,
              height: 14,
              borderRadius: 999,
              background: ORANGE,
            }}
          />
          {SITE_TAGLINE}
        </div>
      </div>
    ),
    { ...size },
  );
}
