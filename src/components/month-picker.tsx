"use client";

import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";

export function MonthPicker({ value, path }: { value: string; path: string }) {
  const router = useRouter();
  return (
    <Input
      key={value}
      type="month"
      defaultValue={value}
      aria-label="Pilih bulan"
      onChange={(e) => e.target.value && router.push(`${path}?bulan=${e.target.value}`)}
      className="w-auto"
    />
  );
}
