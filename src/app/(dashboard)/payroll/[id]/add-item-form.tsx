"use client";

import { useRef } from "react";
import { ActionForm, SubmitButton } from "@/components/action-form";
import { CurrencyInput } from "@/components/currency-input";
import { Field } from "@/components/field";
import { SelectField } from "@/components/select-field";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { addItem } from "../actions";

const SUGGEST = ["Bonus Penjualan", "Bonus Satuan", "Bonus Performa", "Kesehatan", "Reimburse", "Lain-lain"];

// Adds a manual bonus/reimbursement/deduction to one slip. Quick-pick chips fill the name; any name can still be typed.
export function AddItemForm({ payslipId, employeeName }: { payslipId: string; employeeName: string }) {
  const name = useRef<HTMLInputElement>(null);

  return (
    <ActionForm action={addItem} className="flex flex-wrap items-end gap-3 border-t pt-4">
      <input type="hidden" name="payslip_id" value={payslipId} />
      <p className="basis-full text-sm font-medium">Tambah ke slip {employeeName}</p>
      <div className="flex basis-full flex-wrap gap-2" role="group" aria-label="Pilih cepat">
        {SUGGEST.map((s) => (
          <Button
            key={s}
            type="button"
            variant="outline"
            size="sm"
            className="rounded-full"
            onClick={() => {
              if (name.current) name.current.value = s;
              name.current?.focus();
            }}
          >
            {s}
          </Button>
        ))}
      </div>
      <Field label="Nama tambahan" className="w-56">
        <Input ref={name} name="name" required placeholder="atau ketik sendiri" autoComplete="off" />
      </Field>
      <Field label="Jenis" className="w-64">
        <SelectField
          name="kind"
          options={[
            { value: "earning", label: "Penerimaan (menambah)" },
            { value: "deduction", label: "Potongan (mengurangi)" },
          ]}
        />
      </Field>
      <Field label="Nominal" className="w-48">
        <CurrencyInput name="amount" required />
      </Field>
      <SubmitButton variant="outline">Tambah</SubmitButton>
    </ActionForm>
  );
}
