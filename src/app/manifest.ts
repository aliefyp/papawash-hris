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
    background_color: "#fcfcfd",
    theme_color: "#02757c",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
