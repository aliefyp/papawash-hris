"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { CalendarCheck, HandCoins, House, Receipt, Smartphone, UserRound, Users, type LucideIcon } from "lucide-react";
import { NAV } from "@/lib/nav";

const ICONS: Record<string, LucideIcon> = {
  "/": House,
  "/absensi": CalendarCheck,
  "/izin": UserRound,
  "/karyawan": Users,
  "/payroll": Receipt,
  "/pinjaman": HandCoins,
  "/perangkat": Smartphone,
};

export function DashboardNav() {
  const path = usePathname();
  return (
    <nav className="flex gap-1 overflow-x-auto md:flex-col md:overflow-visible" aria-label="Menu utama">
      {NAV.map(({ href, label }) => {
        const active = href === "/" ? path === "/" : path.startsWith(href);
        const Icon = ICONS[href];
        return (
          <Link
            key={href}
            href={href}
            aria-current={active ? "page" : undefined}
            className={`flex items-center gap-2.5 whitespace-nowrap rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
              active
                ? "bg-accent text-accent-foreground"
                : "text-muted-foreground hover:bg-accent/60 hover:text-accent-foreground"
            }`}
          >
            {Icon && <Icon className={`size-4 shrink-0 ${active ? "text-primary" : ""}`} strokeWidth={1.75} aria-hidden />}
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
