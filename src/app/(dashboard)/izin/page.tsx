import { CalendarOff } from "lucide-react";
import { ConfirmAction } from "@/components/confirm-action";
import { EmptyState } from "@/components/empty-state";
import { Field } from "@/components/field";
import { FormDialog } from "@/components/form-dialog";
import { MonthPicker } from "@/components/month-picker";
import { SelectField } from "@/components/select-field";
import { StatusBadge } from "@/components/status-badge";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { fmtMonth, fmtShortDate, monthDateRange, todayWib } from "@/lib/format";
import { fmtLeave } from "@/lib/leave";
import { createClient } from "@/lib/supabase/server";
import { addLeave, deleteLeave } from "./actions";
import { LeaveDuration } from "./leave-duration";

type Person = { name: string } | null;

export default async function IzinPage({ searchParams }: { searchParams: Promise<{ bulan?: string }> }) {
  const { bulan } = await searchParams;
  const month = /^\d{4}-\d{2}$/.test(bulan ?? "") ? bulan! : todayWib().slice(0, 7);
  const range = monthDateRange(month);

  const supabase = await createClient();
  const [{ data: employees }, leaves] = await Promise.all([
    supabase.from("employees").select("id, name").eq("active", true).order("name"),
    supabase
      .from("leaves")
      .select("id, leave_date, minutes, deducted, note, employees(name)")
      .gte("leave_date", range.from)
      .lt("leave_date", range.to)
      .order("leave_date", { ascending: false }),
  ]);

  const missingTable = leaves.error?.code === "PGRST205" || leaves.error?.code === "42P01";
  const list = leaves.data ?? [];
  const deductedMinutes = list.filter((l) => l.deducted).reduce((s, l) => s + l.minutes, 0);

  const addDialog = employees?.length ? (
    <FormDialog
      action={addLeave}
      trigger="+ Catat izin"
      triggerVariant="default"
      title="Catat izin"
      description="Izin yang dipotong akan menjadi potongan otomatis di slip saat Anda menghitung gaji."
      submitLabel="Simpan izin"
    >
      <Field label="Karyawan" className="sm:col-span-2">
        <SelectField name="employee_id" options={employees.map((e) => ({ value: e.id, label: e.name }))} />
      </Field>
      <Field label="Tanggal izin" className="sm:col-span-2">
        <Input type="date" name="date" required defaultValue={todayWib()} />
      </Field>
      <LeaveDuration />
      <Field label="Perlakuan gaji" className="sm:col-span-2">
        <SelectField
          name="deducted"
          options={[
            { value: "yes", label: "Dipotong dari gaji" },
            { value: "no", label: "Tidak dipotong (izin dibayar)" },
          ]}
        />
      </Field>
      <Field label="Catatan" hint="(opsional)" className="sm:col-span-2">
        <Input name="note" placeholder="mis. urusan keluarga" />
      </Field>
    </FormDialog>
  ) : null;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Izin</h1>
          <p className="text-muted-foreground">{fmtMonth(month)}</p>
        </div>
        <div className="flex items-center gap-2">
          <MonthPicker value={month} path="/izin" />
          {!!list.length && addDialog}
        </div>
      </div>

      {missingTable && (
        <div className="rounded-xl bg-warn-soft p-4 text-sm text-warn">
          <p className="font-semibold">Fitur izin belum aktif di database.</p>
          <p className="mt-1">
            Jalankan isi berkas <b>supabase/migrations/20260929020000_leaves.sql</b> di Supabase SQL Editor, lalu muat ulang
            halaman ini.
          </p>
        </div>
      )}

      {!missingTable && !list.length && (
        <EmptyState
          icon={CalendarOff}
          title="Belum ada izin di bulan ini"
          description="Catat izin karyawan, baik per jam maupun seharian. Yang dipotong otomatis masuk ke gaji saat Anda menghitung gaji."
        >
          {addDialog}
        </EmptyState>
      )}

      {!!list.length && (
        <>
          <p className="text-sm text-muted-foreground">
            {list.length} izin · <b className="text-foreground">{fmtLeave(deductedMinutes) || "0 menit"}</b> dipotong dari gaji
          </p>
          <Card className="gap-0 overflow-hidden py-0">
            <ul className="divide-y divide-border">
              {list.map((l) => (
                <li key={l.id} className="flex flex-wrap items-center gap-x-6 gap-y-1 px-4 py-3">
                  <span className="min-w-28 font-semibold">{(l.employees as unknown as Person)?.name}</span>
                  <span className="text-sm">{fmtShortDate(`${l.leave_date}T12:00:00+07:00`)}</span>
                  <span className="text-sm">{fmtLeave(l.minutes)}</span>
                  {l.note && <span className="text-sm text-muted-foreground">{l.note}</span>}
                  <StatusBadge tone={l.deducted ? "warn" : "neutral"} className="ml-auto">
                    {l.deducted ? "Dipotong" : "Tidak dipotong"}
                  </StatusBadge>
                  <ConfirmAction
                    action={deleteLeave}
                    fields={{ id: l.id }}
                    trigger="Hapus"
                    triggerVariant="ghost"
                    triggerSize="sm"
                    title="Hapus catatan izin ini?"
                    confirmLabel="Hapus"
                    danger
                  >
                    <p>
                      Izin {(l.employees as unknown as Person)?.name} ({fmtLeave(l.minutes)}) dihapus. Kalau payroll bulan ini masih
                      draft, klik Hitung ulang agar potongannya ikut hilang.
                    </p>
                  </ConfirmAction>
                </li>
              ))}
            </ul>
          </Card>
        </>
      )}
    </div>
  );
}
