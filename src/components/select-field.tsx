"use client";

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

// shadcn Select that submits with the surrounding form (it renders a hidden native select for `name`).
export function SelectField({
  name,
  options,
  defaultValue,
  className,
  ariaLabel,
}: {
  name: string;
  options: { value: string; label: string }[];
  defaultValue?: string;
  className?: string;
  ariaLabel?: string;
}) {
  return (
    <Select name={name} defaultValue={defaultValue ?? options[0]?.value} required>
      <SelectTrigger className={className ?? "w-full"} aria-label={ariaLabel}>
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {options.map((o) => (
          <SelectItem key={o.value} value={o.value}>
            {o.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
