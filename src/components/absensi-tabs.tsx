"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
  { href: "/absensi", label: "Harian" },
  { href: "/absensi/bulanan", label: "Bulanan" },
];

export function AbsensiTabs() {
  const path = usePathname();
  return (
    <nav className="flex gap-1 border-b" aria-label="Tampilan absensi">
      {TABS.map(({ href, label }) => {
        const active = href === "/absensi" ? path === "/absensi" : path.startsWith(href);
        return (
          <Link
            key={href}
            href={href}
            aria-current={active ? "page" : undefined}
            className={`-mb-px border-b-2 px-4 py-2 text-sm font-medium transition-colors ${
              active ? "border-primary text-foreground" : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
