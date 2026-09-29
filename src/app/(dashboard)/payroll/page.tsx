import { Users, Wallet } from "lucide-react";
import Link from "next/link";
import { SubmitButton } from "@/components/action-form";
import { EmptyState } from "@/components/empty-state";
import { Field } from "@/components/field";
import { SelectField } from "@/components/select-field";
import { StatusBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { fmtMonth, fmtRp, fmtShortDate, todayWib } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";
import { generatePayroll } from "./actions";

type Person = { name: string } | null;

export default async function PayrollPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { error } = await searchParams;
  const supabase = await createClient();
  const [{ data: outlets }, { data: periods }, { data: flagged }] = await Promise.all([
    supabase.from("outlets").select("id, name").order("name"),
    supabase
      .from("payroll_periods")
      .select("id, month, status, outlets(name), payslips(net_pay)")
      .order("month", { ascending: false }),
    error === "koreksi"
      ? supabase
          .from("attendance_sessions")
          .select("id, clock_in_at, employees(name)")
          .eq("status", "perlu_koreksi")
          .order("clock_in_at")
      : Promise.resolve({ data: null }),
  ]);

  return (
    <div className="flex flex-col gap-8">
      <h1 className="text-2xl font-semibold tracking-tight">Payroll</h1>

      {error === "koreksi" && (
        <div className="rounded-xl bg-warn-soft p-4 text-sm text-warn">
          <p className="font-semibold">Gaji belum bisa dihitung: masih ada hari yang perlu dikoreksi.</p>
          <p className="mt-1">Isi jam pulang untuk hari berikut di menu Absensi, lalu hitung gaji lagi:</p>
          <ul className="mt-2 flex flex-wrap gap-2">
            {(flagged ?? []).map((f) => (
              <li key={f.id}>
                <Button asChild variant="secondary" size="sm" className="rounded-full bg-card">
                  <Link
                    href={`/absensi?tanggal=${new Date(new Date(f.clock_in_at).getTime() + 7 * 3_600_000).toISOString().slice(0, 10)}`}
                  >
                    {(f.employees as unknown as Person)?.name} · {fmtShortDate(f.clock_in_at)}
                  </Link>
                </Button>
              </li>
            ))}
          </ul>
        </div>
      )}
      {error === "gagal" && (
        <p className="rounded-xl bg-danger-soft px-4 py-3 text-sm text-destructive">Gagal menghitung gaji. Coba lagi sebentar lagi.</p>
      )}

      {outlets?.length ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Hitung gaji bulanan</CardTitle>
            <CardDescription className="max-w-prose">
              Sistem menghitung gaji pokok, lembur dari absensi, dan cicilan pinjaman. Setelah itu Anda bisa menambah bonus atau
              potongan sebelum mengunci.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form action={generatePayroll} className="flex flex-wrap items-end gap-3">
              <Field label="Bulan">
                <Input type="month" name="month" required defaultValue={todayWib().slice(0, 7)} />
              </Field>
              <Field label="Cabang" className="w-52">
                <SelectField name="outlet_id" options={outlets.map((o) => ({ value: o.id, label: o.name }))} />
              </Field>
              <SubmitButton pendingLabel="Menghitung…">Hitung gaji</SubmitButton>
            </form>
          </CardContent>
        </Card>
      ) : (
        <EmptyState
          icon={Users}
          title="Belum bisa menghitung gaji"
          description="Payroll dihitung dari cabang, karyawan, dan absensi. Tambahkan cabang dan karyawan dulu."
        >
          <Button asChild>
            <Link href="/karyawan">Ke halaman Karyawan</Link>
          </Button>
        </EmptyState>
      )}

      {periods?.length ? (
        <section>
          <h2 className="mb-3 text-lg font-semibold">Riwayat payroll</h2>
          <Card className="gap-0 overflow-hidden py-0">
            <ul className="divide-y divide-border">
              {periods.map((p) => {
                const slips = p.payslips as unknown as { net_pay: number }[];
                const total = slips.reduce((s, x) => s + x.net_pay, 0);
                return (
                  <li key={p.id}>
                    <Link href={`/payroll/${p.id}`} className="flex flex-wrap items-center gap-x-6 gap-y-1 px-4 py-3 hover:bg-muted/60">
                      <span className="min-w-36 font-semibold">{fmtMonth(p.month.slice(0, 7))}</span>
                      <span className="text-sm text-muted-foreground">{(p.outlets as unknown as Person)?.name}</span>
                      <span className="text-sm">
                        {slips.length} karyawan · <b>{fmtRp(total)}</b>
                      </span>
                      <StatusBadge tone={p.status === "final" ? "ok" : "warn"} className="ml-auto">
                        {p.status === "final" ? "Terkunci" : "Draft, belum dikunci"}
                      </StatusBadge>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </Card>
        </section>
      ) : !!outlets?.length ? (
        <EmptyState
          icon={Wallet}
          title="Belum ada payroll"
          description="Riwayat gaji tiap bulan muncul di sini setelah Anda menghitung gaji pertama."
        />
      ) : null}
    </div>
  );
}
