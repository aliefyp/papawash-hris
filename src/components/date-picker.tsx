"use client";

import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";

export function DatePicker({ value }: { value: string }) {
  const router = useRouter();
  return (
    <Input
      key={value}
      type="date"
      defaultValue={value}
      aria-label="Pilih tanggal"
      onChange={(e) => e.target.value && router.push(`/absensi?tanggal=${e.target.value}`)}
      className="w-auto"
    />
  );
}
