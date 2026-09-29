import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["@react-pdf/renderer"],
  // Dev only: lets a phone reach the dev server through the cloudflared tunnel. Update per tunnel run.
  allowedDevOrigins: ["armed-citizen-march-outdoors.trycloudflare.com"],
};

export default nextConfig;
