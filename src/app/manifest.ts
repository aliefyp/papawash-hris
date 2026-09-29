import type { MetadataRoute } from "next";

// Installable as the store-phone attendance app: opens straight to /absen, full screen, portrait.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Papawash Absen",
    short_name: "Absen",
    description: "Absensi selfie karyawan Papawash",
    start_url: "/absen",
    scope: "/absen",
    display: "standalone",
    orientation: "portrait",
    background_color: "#f6f8fc",
    theme_color: "#1f55d9",
    icons: [
      { src: "/pwa-icon/192", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/pwa-icon/512", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/pwa-icon/maskable", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
