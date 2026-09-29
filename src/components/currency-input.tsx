"use client";

import { useEffect, useRef, useState } from "react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

const group = (digits: string) => digits.replace(/\B(?=(\d{3})+(?!\d))/g, ".");

// Rupiah field: shows "Rp 1.750.000" while typing and submits the plain integer under `name`.
export function CurrencyInput({
  name,
  defaultValue,
  required,
  placeholder = "0",
  className,
}: {
  name: string;
  defaultValue?: number;
  required?: boolean;
  placeholder?: string;
  className?: string;
}) {
  const initial = defaultValue != null ? String(defaultValue) : "";
  const [digits, setDigits] = useState(initial);
  const hidden = useRef<HTMLInputElement>(null);

  // A surrounding form resets to empty after a successful action; keep the state in step.
  useEffect(() => {
    const form = hidden.current?.form;
    const reset = () => setDigits(initial);
    form?.addEventListener("reset", reset);
    return () => form?.removeEventListener("reset", reset);
  }, [initial]);

  return (
    <div className="relative">
      <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-sm text-muted-foreground">Rp</span>
      <Input
        inputMode="numeric"
        autoComplete="off"
        required={required}
        placeholder={placeholder}
        value={group(digits)}
        onChange={(e) => setDigits(e.target.value.replace(/\D/g, "").slice(0, 12))}
        className={cn("pl-10", className)}
      />
      <input ref={hidden} type="hidden" name={name} value={digits} />
    </div>
  );
}
