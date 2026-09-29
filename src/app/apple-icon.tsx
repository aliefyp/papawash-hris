import { ImageResponse } from "next/og";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", background: "#1f55d9" }}>
        <svg width={112} height={112} viewBox="0 0 24 24" fill="#ffffff">
          <path d="M12 2.5c3.5 4.2 6 7.1 6 10.1a6 6 0 0 1-12 0c0-3 2.5-5.9 6-10.1z" />
        </svg>
      </div>
    ),
    size,
  );
}
