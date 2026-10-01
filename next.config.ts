import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["@react-pdf/renderer"],
  // Dev only: lets a phone reach the dev server through the cloudflared tunnel. Update per tunnel run.
  allowedDevOrigins: ["bugs-senators-seminar-face.trycloudflare.com"],
};

export default nextConfig;
