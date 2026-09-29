"use client";

import { useActionState } from "react";
import { Field } from "@/components/field";
import { SelectField } from "@/components/select-field";
import { SubmitButton } from "@/components/action-form";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { createPairing, type Pairing } from "./actions";

export function PairForm({ outlets }: { outlets: { id: string; name: string }[] }) {
  const [state, action] = useActionState<Pairing, FormData>(createPairing, {});

  return (
    <Card>
      <CardContent>
        <form action={action} className="flex flex-wrap items-end gap-3">
          <Field label="Cabang" className="w-52">
            <SelectField name="outlet_id" options={outlets.map((o) => ({ value: o.id, label: o.name }))} />
          </Field>
          <Field label="Nama HP" hint="(opsional)" className="w-52">
            <Input name="label" placeholder="HP kasir" />
          </Field>
          <SubmitButton pendingLabel="Membuat kode…">Buat kode untuk HP toko</SubmitButton>
        </form>

        {state.error && <p className="mt-3 text-sm text-destructive">{state.error}</p>}
        {state.code && (
          <div className="mt-5 rounded-lg bg-accent p-4">
            <p className="text-sm text-muted-foreground">Ketik kode ini di HP toko. Berlaku 15 menit dan hanya bisa dipakai sekali.</p>
            <p className="mt-1 font-mono text-3xl font-semibold tracking-widest text-accent-foreground">{state.code}</p>
            <p className="mt-2 text-sm text-muted-foreground">
              Di HP toko, buka alamat aplikasi dengan akhiran <b className="text-foreground">/absen</b>, lalu masukkan kode.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
