import { CalendarDays } from "lucide-react";
import Link from "next/link";
import { ActionForm, SubmitButton } from "@/components/action-form";
import { DatePicker } from "@/components/date-picker";
import { Field } from "@/components/field";
import { EmptyState } from "@/components/empty-state";
import { FormDialog } from "@/components/form-dialog";
import { SelectField } from "@/components/select-field";
import { StatusBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  fmtDate,
  fmtDuration,
  fmtShortDate,
  fmtTime,
  todayWib,
  wibDayRange,
  wibLocalInput,
} from "@/lib/format";
import { overtimeHours } from "@/lib/overtime";
import { retentionCutoff } from "@/lib/photo-retention";
import { createClient } from "@/lib/supabase/server";
import { addManualSession, correctSession } from "./actions";

const BADGE = {
  ok: { label: "Normal", tone: "ok" },
  perlu_koreksi: { label: "Perlu koreksi", tone: "warn" },
  dikoreksi: { label: "Dikoreksi", tone: "neutral" },
} as const;

const shift = (date: string, days: number) =>
  new Date(new Date(`${date}T00:00:00Z`).getTime() + days * 86_400_000).toISOString().slice(0, 10);

type Person = { name: string } | null;

// Clock-in and clock-out of one session. The clock-out may stay empty only for a session that is still open.
function TimeFields({
  id,
  clockIn,
  clockOut,
  note,
  requireOut,
}: {
  id: string;
  clockIn: string;
  clockOut: string | null;
  note?: string;
  requireOut: boolean;
}) {
  return (
    <>
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="require_out" value={requireOut ? "yes" : "no"} />
      <Field label="Jam masuk (WIB)" className="min-w-56 flex-1">
        <Input type="datetime-local" name="clock_in" required defaultValue={wibLocalInput(clockIn)} />
      </Field>
      <Field label="Jam pulang (WIB)" hint={requireOut ? undefined : "(kosongkan jika belum pulang)"} className="min-w-56 flex-1">
        <Input
          type="datetime-local"
          name="clock_out"
          required={requireOut}
          defaultValue={clockOut ? wibLocalInput(clockOut) : requireOut ? wibLocalInput(clockIn, 9) : ""}
        />
      </Field>
      <Field label="Alasan" className="min-w-56 sm:col-span-2">
        <Input name="note" required defaultValue={note} placeholder="mis. Salah ketuk, atau lupa absen pulang" />
      </Field>
    </>
  );
}

const photoCutoff = () => retentionCutoff(new Date());

export default async function AbsensiPage({ searchParams }: { searchParams: Promise<{ tanggal?: string }> }) {
  const { tanggal } = await searchParams;
  const date = /^\d{4}-\d{2}-\d{2}$/.test(tanggal ?? "") ? tanggal! : todayWib();
  const { from, to } = wibDayRange(date);

  const supabase = await createClient();
  const [{ data: sessions }, { data: employees }, { data: flagged }] = await Promise.all([
    supabase
      .from("attendance_sessions")
      .select("id, clock_in_at, clock_out_at, clock_in_photo, clock_out_photo, status, correction_note, employees(name)")
      .gte("clock_in_at", from)
      .lt("clock_in_at", to)
      .order("clock_in_at"),
    supabase.from("employees").select("id, name").eq("active", true).order("name"),
    supabase
      .from("attendance_sessions")
      .select("id, clock_in_at, employees(name)")
      .eq("status", "perlu_koreksi")
      .order("clock_in_at")
      .limit(20),
  ]);

  const paths = (sessions ?? []).flatMap((s) => [s.clock_in_photo, s.clock_out_photo]).filter(Boolean) as string[];
  const { data: signed } = paths.length
    ? await supabase.storage.from("attendance-photos").createSignedUrls(paths, 3600)
    : { data: [] };
  const url = new Map((signed ?? []).map((s) => [s.path, s.signedUrl]));
  const cutoff = photoCutoff();

  const manualDialog = employees?.length ? (
    <FormDialog
            action={addManualSession}
            trigger="+ Tambah absensi manual"
            title="Tambah absensi manual"
            description="Untuk hari saat HP toko rusak atau karyawan lupa absen sama sekali. Tidak ada foto, dan ditandai Dikoreksi."
            submitLabel="Simpan absensi"
          >
            <Field label="Karyawan" className="sm:col-span-2">
              <SelectField name="employee_id" options={employees.map((e) => ({ value: e.id, label: e.name }))} />
            </Field>
            <Field label="Masuk (WIB)">
              <Input type="datetime-local" name="clock_in" required defaultValue={`${date}T09:00`} />
            </Field>
            <Field label="Pulang (WIB)">
              <Input type="datetime-local" name="clock_out" required defaultValue={`${date}T18:00`} />
            </Field>
            <Field label="Alasan" className="sm:col-span-2">
              <Input name="note" required placeholder="mis. HP toko rusak" />
            </Field>
          </FormDialog>
  ) : null;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Absensi</h1>
          <p className="text-muted-foreground">{fmtDate(`${date}T12:00:00+07:00`)}</p>
        </div>
        <div className="flex items-center gap-2">
          <Button asChild variant="outline" size="icon" aria-label="Hari sebelumnya">
            <Link href={`?tanggal=${shift(date, -1)}`}>←</Link>
          </Button>
          <DatePicker value={date} />
          <Button asChild variant="outline" size="icon" aria-label="Hari berikutnya">
            <Link href={`?tanggal=${shift(date, 1)}`}>→</Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/absensi">Hari ini</Link>
          </Button>
        </div>
      </div>

      {!!flagged?.length && (
        <div className="rounded-xl bg-warn-soft p-4 text-sm text-warn">
          <p className="font-semibold">{flagged.length} hari perlu dikoreksi (lupa absen pulang)</p>
          <ul className="mt-2 flex flex-wrap gap-2">
            {flagged.map((f) => (
              <li key={f.id}>
                <Button asChild variant="secondary" size="sm" className="rounded-full bg-card">
                  <Link
                    href={`?tanggal=${new Date(new Date(f.clock_in_at).getTime() + 7 * 3_600_000).toISOString().slice(0, 10)}`}
                  >
                    {(f.employees as unknown as Person)?.name} · {fmtShortDate(f.clock_in_at)}
                  </Link>
                </Button>
              </li>
            ))}
          </ul>
        </div>
      )}

      {sessions?.length ? (
        <Card className="gap-0 overflow-hidden py-0">
          <ul className="divide-y divide-border">
            {sessions.map((s) => {
              const badge = BADGE[s.status as keyof typeof BADGE];
              const open = !s.clock_out_at;
              const isFlagged = s.status === "perlu_koreksi";
              const ot = s.clock_out_at && !isFlagged ? overtimeHours(s.clock_in_at, s.clock_out_at) : 0;
              const name = (s.employees as unknown as Person)?.name;
              return (
                <li key={s.id} className="flex flex-col gap-3 p-4">
                  <div className="flex flex-wrap items-center gap-x-6 gap-y-1">
                    <span className="min-w-28 text-base font-semibold">{name}</span>
                    <span>
                      {fmtTime(s.clock_in_at)} – {open ? "…" : isFlagged ? "belum diisi" : fmtTime(s.clock_out_at!)}
                    </span>
                    <span className="text-sm text-muted-foreground">
                      {open ? "Masih di toko" : isFlagged ? "" : fmtDuration(s.clock_in_at, s.clock_out_at!)}
                      {ot > 0 && <b className="ml-2 font-medium text-foreground">lembur {ot} jam</b>}
                    </span>
                    <StatusBadge tone={badge.tone} className="ml-auto">
                      {badge.label}
                    </StatusBadge>
                  </div>

                  <div className="flex flex-wrap gap-3">
                    {[
                      { label: "Foto masuk", path: s.clock_in_photo },
                      { label: "Foto pulang", path: s.clock_out_photo },
                    ].map(({ label: cap, path }) => {
                      const href = path ? url.get(path) : undefined;
                      return (
                        <figure key={cap} className="text-xs text-muted-foreground">
                          {href ? (
                            <a href={href} target="_blank" rel="noreferrer" title="Buka foto ukuran penuh">
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img src={href} alt={`${cap} ${name}`} className="h-28 w-auto rounded-lg border" />
                            </a>
                          ) : (
                            <div className="grid h-28 w-24 place-items-center rounded-lg border border-dashed text-center">
                              {cap === "Foto pulang" && open ? "Belum pulang" : s.clock_in_at < cutoff ? "Foto sudah dihapus" : "Tanpa foto"}
                            </div>
                          )}
                          <figcaption className="mt-1">{cap}</figcaption>
                        </figure>
                      );
                    })}
                  </div>

                  {s.correction_note && <p className="text-sm text-muted-foreground">Catatan: {s.correction_note}</p>}

                  {isFlagged ? (
                    <div className="rounded-lg bg-warn-soft p-4">
                      <p className="mb-3 text-sm text-warn">
                        {name} masuk pukul <b>{fmtTime(s.clock_in_at)}</b> tanggal {fmtShortDate(s.clock_in_at)} tapi tidak absen
                        pulang. Isi jam pulang sebenarnya (jam masuk juga bisa diubah kalau salah):
                      </p>
                      <ActionForm action={correctSession} className="flex flex-wrap items-end gap-3">
                        <TimeFields id={s.id} clockIn={s.clock_in_at} clockOut={null} note="Lupa absen pulang" requireOut />
                        <SubmitButton>Simpan koreksi</SubmitButton>
                      </ActionForm>
                    </div>
                  ) : (
                    <div>
                      <FormDialog
                        action={correctSession}
                        trigger="Koreksi jam"
                        title={`Koreksi jam ${name}`}
                        description="Ubah jam masuk dan/atau jam pulang. Foto selfie tidak ikut berubah, dan perubahan dicatat otomatis."
                        submitLabel="Simpan koreksi"
                      >
                        <TimeFields id={s.id} clockIn={s.clock_in_at} clockOut={s.clock_out_at} requireOut={!open} />
                      </FormDialog>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        </Card>
      ) : (
        <EmptyState
          icon={CalendarDays}
          title={date === todayWib() ? "Belum ada yang absen hari ini" : "Tidak ada absensi di tanggal ini"}
          description="Kalau toko libur, tidak ada yang perlu dilakukan. Kalau seharusnya ada, periksa HP toko di Cabang & HP toko, atau tambahkan absensi manual."
        >
          {manualDialog}
        </EmptyState>
      )}

      {!!sessions?.length && manualDialog && <div>{manualDialog}</div>}

      <p className="text-xs text-muted-foreground">Foto selfie disimpan 90 hari, lalu dihapus otomatis.</p>
    </div>
  );
}
