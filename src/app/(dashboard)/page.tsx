import Link from "next/link";
import { StatusBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { fmtDate, fmtMonth, fmtShortDate, fmtTime, todayWib, wibDayRange } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";

type Person = { name: string } | null;

function Check({ done }: { done: boolean }) {
  return (
    <span
      className={`grid size-6 shrink-0 place-items-center rounded-full border ${
        done ? "border-ok bg-ok text-white" : "border-border bg-card text-transparent"
      }`}
      aria-hidden
    >
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" className="size-3.5">
        <path d="M5 12.5l4.5 4.5L19 7.5" />
      </svg>
    </span>
  );
}

export default async function HomePage() {
  const supabase = await createClient();
  const today = todayWib();
  const month = today.slice(0, 7);
  const { from, to } = wibDayRange(today);

  const [outlets, employees, devices, flagged, sessions, periods] = await Promise.all([
    supabase.from("outlets").select("id", { count: "exact", head: true }),
    supabase.from("employees").select("id, name").eq("active", true).order("name"),
    supabase.from("devices").select("id", { count: "exact", head: true }).eq("status", "active"),
    supabase
      .from("attendance_sessions")
      .select("id, clock_in_at, employees(name)")
      .eq("status", "perlu_koreksi")
      .order("clock_in_at")
      .limit(10),
    supabase
      .from("attendance_sessions")
      .select("employee_id, clock_in_at, clock_out_at")
      .gte("clock_in_at", from)
      .lt("clock_in_at", to)
      .order("clock_in_at"),
    supabase.from("payroll_periods").select("id, status").eq("month", `${month}-01`),
  ]);

  const steps = [
    { done: (outlets.count ?? 0) > 0, label: "Tambah cabang", hint: "Nama toko Anda.", href: "/perangkat" },
    { done: (employees.data?.length ?? 0) > 0, label: "Tambah karyawan", hint: "Nama, gaji pokok, dan upah lembur.", href: "/karyawan" },
    { done: (devices.count ?? 0) > 0, label: "Daftarkan HP toko", hint: "HP yang dipakai untuk absen selfie.", href: "/perangkat" },
  ];
  const setupDone = steps.every((s) => s.done);

  const attention: { key: string; text: string; href: string; action: string }[] = [];
  if (flagged.data?.length) {
    const f = flagged.data;
    attention.push({
      key: "koreksi",
      text: `${f.length} hari perlu dikoreksi karena lupa absen pulang: ${f
        .slice(0, 3)
        .map((x) => `${(x.employees as unknown as Person)?.name} (${fmtShortDate(x.clock_in_at)})`)
        .join(", ")}${f.length > 3 ? ", …" : ""}`,
      href: `/absensi?tanggal=${new Date(new Date(f[0].clock_in_at).getTime() + 7 * 3_600_000).toISOString().slice(0, 10)}`,
      action: "Koreksi sekarang",
    });
  }
  if (setupDone) {
    const p = periods.data ?? [];
    if (!p.length) {
      attention.push({ key: "payroll", text: `Gaji ${fmtMonth(month)} belum dihitung.`, href: "/payroll", action: "Hitung gaji" });
    } else if (p.some((x) => x.status === "draft")) {
      attention.push({ key: "payroll", text: `Gaji ${fmtMonth(month)} masih draft dan belum dikunci.`, href: `/payroll/${p.find((x) => x.status === "draft")!.id}`, action: "Lanjutkan" });
    }
  }

  const byEmployee = new Map<string, { clock_in_at: string; clock_out_at: string | null }>();
  for (const s of sessions.data ?? []) byEmployee.set(s.employee_id, s);

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Beranda</h1>
        <p className="text-muted-foreground">{fmtDate(`${today}T12:00:00+07:00`)}</p>
      </div>

      {!setupDone && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Mulai dari sini</CardTitle>
            <CardDescription>Tiga langkah sebelum karyawan bisa absen. Kerjakan berurutan.</CardDescription>
          </CardHeader>
          <CardContent>
            <ol className="flex flex-col gap-1">
              {steps.map((s, i) => (
                <li key={s.label}>
                  <Link href={s.href} className="flex items-center gap-3 rounded-lg p-2 hover:bg-muted/60">
                    <Check done={s.done} />
                    <span>
                      <span className={`font-medium ${s.done ? "text-muted-foreground line-through" : ""}`}>
                        {i + 1}. {s.label}
                      </span>
                      <span className="block text-sm text-muted-foreground">{s.hint}</span>
                    </span>
                    {!s.done && <span className="ml-auto text-sm font-semibold text-primary">Buka →</span>}
                  </Link>
                </li>
              ))}
            </ol>
          </CardContent>
        </Card>
      )}

      {attention.length > 0 && (
        <section>
          <h2 className="mb-3 text-lg font-semibold">Perlu perhatian</h2>
          <ul className="flex flex-col gap-3">
            {attention.map((a) => (
              <li key={a.key} className="flex flex-wrap items-center gap-3 rounded-xl bg-warn-soft p-4 text-sm text-warn">
                <span className="min-w-0 flex-1">{a.text}</span>
                <Button asChild variant="secondary" className="bg-card">
                  <Link href={a.href}>{a.action}</Link>
                </Button>
              </li>
            ))}
          </ul>
        </section>
      )}

      {employees.data?.length ? (
        <section>
          <div className="mb-3 flex items-baseline justify-between">
            <h2 className="text-lg font-semibold">Hari ini</h2>
            <Link href="/absensi" className="text-sm font-medium text-primary">
              Lihat semua absensi →
            </Link>
          </div>
          <Card className="gap-0 overflow-hidden py-0">
            <ul className="divide-y divide-border">
              {employees.data.map((e) => {
                const s = byEmployee.get(e.id);
                const status = !s
                  ? { text: "Belum masuk", tone: "neutral" as const }
                  : s.clock_out_at
                    ? { text: `Pulang ${fmtTime(s.clock_out_at)}`, tone: "ok" as const }
                    : { text: `Di toko sejak ${fmtTime(s.clock_in_at)}`, tone: "info" as const };
                return (
                  <li key={e.id} className="flex items-center gap-4 px-4 py-3">
                    <span className="font-medium">{e.name}</span>
                    <StatusBadge tone={status.tone} className="ml-auto">
                      {status.text}
                    </StatusBadge>
                  </li>
                );
              })}
            </ul>
          </Card>
        </section>
      ) : null}
    </div>
  );
}
