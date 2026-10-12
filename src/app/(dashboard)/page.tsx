import Link from "next/link";
import { Check as CheckIcon, TriangleAlert } from "lucide-react";
import { StatusBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import { fmtDate, fmtMonth, fmtShortDate, fmtTime, todayWib, wibDayRange } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";

type Person = { name: string } | null;

function Check({ done }: { done: boolean }) {
  return (
    <span
      className={`grid size-6 shrink-0 place-items-center rounded-full border ${
        done ? "border-ok bg-ok text-white" : "border-input bg-card text-transparent"
      }`}
      aria-hidden
    >
      <CheckIcon className="size-3.5" strokeWidth={3} />
    </span>
  );
}

function Stat({ label, value, tone }: { label: string; value: string; tone?: "warn" }) {
  return (
    <div className="flex flex-col gap-1">
      <dt className="text-sm text-muted-foreground">{label}</dt>
      <dd className={`text-2xl font-medium tracking-tight ${tone === "warn" ? "text-warn" : ""}`}>{value}</dd>
    </div>
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

  const total = employees.data?.length ?? 0;
  const clockedIn = (employees.data ?? []).filter((e) => byEmployee.has(e.id)).length;
  const inStore = (employees.data ?? []).filter((e) => {
    const s = byEmployee.get(e.id);
    return s && !s.clock_out_at;
  }).length;
  const flaggedCount = flagged.data?.length ?? 0;

  return (
    <div className="flex flex-col gap-14">
      <header>
        <p className="text-sm text-muted-foreground">{fmtDate(`${today}T12:00:00+07:00`)}</p>
        {total > 0 ? (
          <>
            <h1 className="mt-3 text-6xl font-medium tracking-tighter">
              <span className="text-primary">{clockedIn}</span>
              <span className="text-muted-foreground"> dari {total}</span>
            </h1>
            <p className="mt-2 text-lg text-muted-foreground">karyawan sudah absen masuk hari ini</p>
            <dl className="mt-8 flex gap-12">
              <Stat label="Masih di toko" value={String(inStore)} />
              <Stat label="Sudah pulang" value={String(clockedIn - inStore)} />
              <Stat label="Perlu koreksi" value={flaggedCount >= 10 ? "10+" : String(flaggedCount)} tone={flaggedCount ? "warn" : undefined} />
            </dl>
          </>
        ) : (
          <h1 className="mt-3 text-3xl font-medium tracking-tight">Beranda</h1>
        )}
      </header>

      {!setupDone && (
        <section>
          <h2 className="text-lg font-medium tracking-tight">Mulai dari sini</h2>
          <p className="mt-1 text-sm text-muted-foreground">Tiga langkah sebelum karyawan bisa absen. Kerjakan berurutan.</p>
          <ol className="mt-4 divide-y divide-border border-y border-border">
            {steps.map((s, i) => (
              <li key={s.label}>
                <Link href={s.href} className="flex items-center gap-3 py-3.5 transition-colors hover:text-foreground">
                  <Check done={s.done} />
                  <span>
                    <span className={`font-medium ${s.done ? "text-muted-foreground line-through" : ""}`}>
                      {i + 1}. {s.label}
                    </span>
                    <span className="block text-sm text-muted-foreground">{s.hint}</span>
                  </span>
                  {!s.done && <span className="ml-auto text-sm font-medium text-primary underline underline-offset-4">Buka</span>}
                </Link>
              </li>
            ))}
          </ol>
        </section>
      )}

      {attention.length > 0 && (
        <section>
          <h2 className="mb-3 text-lg font-medium tracking-tight">Perlu perhatian</h2>
          <ul className="divide-y divide-border border-y border-border">
            {attention.map((a) => (
              <li key={a.key} className="flex flex-wrap items-center gap-3 py-3.5 text-sm">
                <TriangleAlert className="size-4 shrink-0 text-warn" strokeWidth={1.75} aria-hidden />
                <span className="min-w-0 flex-1">{a.text}</span>
                <Button asChild variant="outline" size="sm">
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
            <h2 className="text-lg font-medium tracking-tight">Hari ini</h2>
            <Link href="/absensi" className="text-sm font-medium text-primary underline-offset-4 hover:underline">
              Lihat semua absensi
            </Link>
          </div>
          <ul className="divide-y divide-border border-y border-border">
            {employees.data.map((e) => {
              const s = byEmployee.get(e.id);
              const status = !s
                ? { text: "Belum masuk", tone: "neutral" as const }
                : s.clock_out_at
                  ? { text: `Pulang ${fmtTime(s.clock_out_at)}`, tone: "ok" as const }
                  : { text: `Di toko sejak ${fmtTime(s.clock_in_at)}`, tone: "info" as const };
              return (
                <li key={e.id} className="flex items-center gap-4 py-3.5">
                  <span className="font-medium">{e.name}</span>
                  <StatusBadge tone={status.tone} className="ml-auto">
                    {status.text}
                  </StatusBadge>
                </li>
              );
            })}
          </ul>
        </section>
      ) : null}
    </div>
  );
}
