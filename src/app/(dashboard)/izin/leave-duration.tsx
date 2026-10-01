"use client";

import { useState } from "react";
import { Field } from "@/components/field";
import { SelectField } from "@/components/select-field";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

// "Seharian" (9 jam) or a custom length in hours + minutes. Disabled fields are not submitted.
export function LeaveDuration() {
  const [allDay, setAllDay] = useState(false);
  return (
    <>
      <Label className="flex items-center gap-2 text-sm font-medium sm:col-span-2">
        <Checkbox name="all_day" checked={allDay} onCheckedChange={(v) => setAllDay(v === true)} />
        Seharian (9 jam)
      </Label>
      <Field label="Jam">
        <Input name="hours" type="number" inputMode="numeric" min={0} max={24} defaultValue={1} disabled={allDay} />
      </Field>
      <Field label="Menit">
        <SelectField
          name="minutes"
          options={[0, 15, 30, 45].map((m) => ({ value: String(m), label: `${m} menit` }))}
          disabled={allDay}
        />
      </Field>
    </>
  );
}
