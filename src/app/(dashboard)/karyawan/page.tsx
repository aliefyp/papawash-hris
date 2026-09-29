import { Store, Users } from "lucide-react";
import Link from "next/link";
import { ConfirmAction } from "@/components/confirm-action";
import { Field } from "@/components/field";
import { FormDialog } from "@/components/form-dialog";
import { SelectField } from "@/components/select-field";
import { EmptyState } from "@/components/empty-state";
import { StatusBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { CurrencyInput } from "@/components/currency-input";
import { Input } from "@/components/ui/input";
import { fmtRp } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";
import { addEmployee, setActive, updateEmployee } from "./actions";

type Employee = { name: string; base_salary: number; overtime_rate_per_hour: number };

function Fields({ e }: { e?: Employee }) {
  return (
    <>
      <Field label="Nama" className="sm:col-span-2">
        <Input name="name" required defaultValue={e?.name} />
      </Field>
      <Field label="Gaji pokok per bulan">
        <CurrencyInput name="base_salary" required defaultValue={e?.base_salary} />
      </Field>
      <Field label="Upah lembur per jam">
        <CurrencyInput name="overtime_rate" required defaultValue={e?.overtime_rate_per_hour} />
      </Field>
    </>
  );
}

export default async function KaryawanPage() {
  const supabase = await createClient();
  const [{ data: outlets }, { data: employees }] = await Promise.all([
    supabase.from("outlets").select("id, name").order("name"),
    supabase
      .from("employees")
      .select("id, name, base_salary, overtime_rate_per_hour, active, outlets(name)")
      .order("active", { ascending: false })
      .order("name"),
  ]);

  const hasEmployees = !!employees?.length;
  const addDialog = outlets?.length ? (
    <FormDialog action={addEmployee} trigger="+ Tambah karyawan" triggerVariant="default" title="Tambah karyawan" submitLabel="Simpan">
      <Field label="Cabang" className="sm:col-span-2">
        <SelectField name="outlet_id" options={outlets.map((o) => ({ value: o.id, label: o.name }))} />
      </Field>
      <Fields />
    </FormDialog>
  ) : null;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold tracking-tight">Karyawan</h1>
        {hasEmployees && addDialog}
      </div>

      {!outlets?.length && (
        <EmptyState
          icon={Store}
          title="Belum ada cabang"
          description="Tambahkan cabang dulu. Setelah itu karyawan bisa didaftarkan di sini."
        >
          <Button asChild>
            <Link href="/perangkat">Tambah cabang</Link>
          </Button>
        </EmptyState>
      )}
      {!!outlets?.length && !hasEmployees && (
        <EmptyState
          icon={Users}
          title="Belum ada karyawan"
          description="Tambahkan karyawan supaya mereka bisa absen lewat HP toko dan gajinya ikut dihitung."
        >
          {addDialog}
        </EmptyState>
      )}

      {employees?.length ? (
        <Card className="gap-0 overflow-hidden py-0">
          <ul className="divide-y divide-border">
            {employees.map((e) => (
              <li key={e.id} className={`flex flex-wrap items-center gap-x-6 gap-y-2 p-4 ${e.active ? "" : "bg-muted/50"}`}>
                <div className="min-w-40">
                  <p className="flex items-center gap-2 text-base font-semibold">
                    {e.name}
                    {!e.active && <StatusBadge tone="neutral">Nonaktif</StatusBadge>}
                  </p>
                  <p className="text-sm text-muted-foreground">{(e.outlets as unknown as { name: string } | null)?.name}</p>
                </div>
                <p className="text-sm">
                  Gaji pokok <b>{fmtRp(e.base_salary)}</b>{" "}
                  <span className="text-muted-foreground">· lembur {fmtRp(e.overtime_rate_per_hour)}/jam</span>
                </p>
                <div className="ml-auto flex items-center gap-2">
                  <FormDialog action={updateEmployee} trigger="Ubah" title={`Ubah data ${e.name}`} submitLabel="Simpan perubahan">
                    <input type="hidden" name="id" value={e.id} />
                    <Fields e={e} />
                  </FormDialog>
                  {e.active ? (
                    <ConfirmAction
                      action={setActive}
                      fields={{ id: e.id, active: "false" }}
                      trigger="Nonaktifkan"
                      triggerVariant="ghost"
                      title={`Nonaktifkan ${e.name}?`}
                      confirmLabel="Nonaktifkan"
                      danger
                    >
                      <p>{e.name} tidak akan muncul lagi di layar absen HP toko dan tidak ikut payroll berikutnya.</p>
                      <p>Riwayat absensi dan slip gaji tetap tersimpan. Anda bisa mengaktifkannya lagi kapan saja.</p>
                    </ConfirmAction>
                  ) : (
                    <ConfirmAction
                      action={setActive}
                      fields={{ id: e.id, active: "true" }}
                      trigger="Aktifkan lagi"
                      triggerVariant="ghost"
                      title={`Aktifkan ${e.name} lagi?`}
                      confirmLabel="Aktifkan"
                    >
                      <p>{e.name} akan muncul lagi di layar absen dan ikut payroll berikutnya.</p>
                    </ConfirmAction>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </Card>
      ) : null}
    </div>
  );
}
