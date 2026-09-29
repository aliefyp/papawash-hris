import type { Metadata, Viewport } from "next";

export const metadata: Metadata = {
  title: "Absen — Papawash",
  appleWebApp: { capable: true, title: "Absen", statusBarStyle: "default" },
};

export const viewport: Viewport = {
  themeColor: "#1f55d9",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function AbsenLayout({ children }: { children: React.ReactNode }) {
  return children;
}
