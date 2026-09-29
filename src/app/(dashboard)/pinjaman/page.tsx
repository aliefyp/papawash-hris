import { HandCoins, Users } from "lucide-react";
import Link from "next/link";
import { ActionForm, SubmitButton } from "@/components/action-form";
import { EmptyState } from "@/components/empty-state";
import { Field } from "@/components/field";
import { SelectField } from "@/components/select-field";
import { StatusBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CurrencyInput } from "@/components/currency-input";
import { Input } from "@/components/ui/input";
import { fmtRp } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";
import { addLoan } from "./actions";

export default async function PinjamanPage() {
  const supabase = await createClient();
  const [{ data: employees }, { data: loans }] = await Promise.all([
    supabase.from("employees").select("id, name").eq("active", true).order("name"),
    supabase
      .from("loans")
      .select("id, total_amount, monthly_installment, remaining, note, created_at, employees(name)")
      .order("created_at", { ascending: false }),
  ]);

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Pinjaman</h1>
        <p className="mt-1 max-w-prose text-muted-foreground">
          Catat pinjaman karyawan sekali saja. Cicilannya otomatis dipotong di payroll tiap bulan sampai lunas.
        </p>
      </div>

      {employees?.length ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Catat pinjaman baru</CardTitle>
          </CardHeader>
          <CardContent>
            <ActionForm action={addLoan} className="flex flex-wrap items-end gap-3">
              <Field label="Karyawan" className="w-44">
                <SelectField name="employee_id" options={employees.map((e) => ({ value: e.id, label: e.name }))} />
              </Field>
              <Field label="Total pinjaman" className="w-48">
                <CurrencyInput name="total" required />
              </Field>
              <Field label="Cicilan per bulan" className="w-48">
                <CurrencyInput name="installment" required />
              </Field>
              <Field label="Catatan" hint="(opsional)" className="w-52">
                <Input name="note" />
              </Field>
              <SubmitButton>Catat pinjaman</SubmitButton>
            </ActionForm>
          </CardContent>
        </Card>
      ) : (
        <EmptyState
          icon={Users}
          title="Belum ada karyawan"
          description="Pinjaman dicatat atas nama karyawan. Tambahkan karyawan dulu."
        >
          <Button asChild>
            <Link href="/karyawan">Ke halaman Karyawan</Link>
          </Button>
        </EmptyState>
      )}

      {loans?.length ? (
        <Card className="gap-0 overflow-hidden py-0">
          <ul className="divide-y divide-border">
            {loans.map((l) => (
              <li key={l.id} className="flex flex-wrap items-center gap-x-6 gap-y-1 px-4 py-3">
                <span className="min-w-28 font-semibold">{(l.employees as unknown as { name: string }).name}</span>
                <span className="text-sm text-muted-foreground">
                  total {fmtRp(l.total_amount)} · cicilan {fmtRp(l.monthly_installment)}/bulan
                  {l.note ? ` · ${l.note}` : ""}
                </span>
                <span className="ml-auto text-sm">
                  {l.remaining === 0 ? (
                    <StatusBadge tone="ok">Lunas</StatusBadge>
                  ) : (
                    <>
                      Sisa <b>{fmtRp(l.remaining)}</b>
                    </>
                  )}
                </span>
              </li>
            ))}
          </ul>
        </Card>
      ) : !!employees?.length ? (
        <EmptyState
          icon={HandCoins}
          title="Belum ada pinjaman"
          description="Pinjaman karyawan dan sisanya tampil di sini. Cicilannya otomatis dipotong di payroll tiap bulan."
        />
      ) : null}
    </div>
  );
}
