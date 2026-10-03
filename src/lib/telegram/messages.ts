import type { Recap } from "../attendance-recap";
import { fmtDate, fmtHours, fmtMonth, fmtShortDate, fmtTime } from "../format";
import { fmtLeave } from "../leave";
import { overtimeHours } from "../overtime";
import type { ParsedIzin } from "./parse-izin";

// All texts use Telegram's HTML mode. Dynamic values go through esc().
export const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const b = (s: string) => `<b>${esc(s)}</b>`;
const dm = (min: number) => (min >= 60 ? `${Math.floor(min / 60)} j ${min % 60} m` : `${min} m`);
const link = (url: string, label: string) => `<a href="${esc(url)}">${esc(label)}</a>`;
const noon = (date: string) => `${date}T12:00:00+07:00`;

type Emp = { id: string; name: string };
export type Sess = { employee_id: string; clock_in_at: string; clock_out_at: string | null; status: string };
export type Flagged = { name: string; clock_in_at: string };

const flaggedLine = (flagged: Flagged[]) =>
  `Perlu koreksi: ${flagged.length} hari (${flagged
    .slice(0, 4)
    .map((f) => `${esc(f.name)} · ${esc(fmtShortDate(f.clock_in_at))}`)
    .join(", ")}${flagged.length > 4 ? ", …" : ""})`;

export const noCheckinMessage = () =>
  "⚠️ Sudah 07:05 dan belum ada yang absen masuk hari ini. Cek HP toko atau hubungi karyawan.";

export function daySummaryMessage(o: {
  date: string; // YYYY-MM-DD (WIB)
  employees: Emp[];
  sessions: Sess[];
  leaves: { employee_id: string; minutes: number; deducted: boolean }[];
  flagged: Flagged[];
  url: string;
}) {
  const lines = [`📋 ${b(`Ringkasan ${fmtDate(noon(o.date))}`)}`];

  if (!o.sessions.length) {
    lines.push("Tidak ada absensi hari ini.");
  } else {
    for (const e of o.employees) {
      const own = o.sessions.filter((s) => s.employee_id === e.id).sort((x, y) => x.clock_in_at.localeCompare(y.clock_in_at));
      if (!own.length) {
        lines.push(`• ${b(e.name)}: tidak masuk`);
        continue;
      }
      const first = fmtTime(own[0].clock_in_at);
      const last = own[own.length - 1];
      const counted = own.filter((s) => s.clock_out_at && s.status !== "perlu_koreksi");
      if (!last.clock_out_at) {
        lines.push(`• ${b(e.name)}: ${first} – belum pulang`);
      } else if (last.status === "perlu_koreksi") {
        lines.push(`• ${b(e.name)}: ${first} – jam pulang belum diisi`);
      } else {
        const minutes = counted.reduce((sum, s) => sum + Math.round((new Date(s.clock_out_at!).getTime() - new Date(s.clock_in_at).getTime()) / 60_000), 0);
        const ot = Math.round(counted.reduce((sum, s) => sum + overtimeHours(s.clock_in_at, s.clock_out_at!), 0) * 100) / 100;
        lines.push(`• ${b(e.name)}: ${first}–${fmtTime(last.clock_out_at)} (${dm(minutes)})${ot ? `, lembur ${fmtHours(ot)} j` : ""}`);
      }
    }
  }

  const names = new Map(o.employees.map((e) => [e.id, e.name]));
  if (o.leaves.length) {
    lines.push(`Izin hari ini: ${o.leaves.map((l) => `${esc(names.get(l.employee_id) ?? "?")} ${esc(fmtLeave(l.minutes))} (${l.deducted ? "dipotong" : "dibayar"})`).join(", ")}`);
  }
  if (o.flagged.length) lines.push(flaggedLine(o.flagged));
  lines.push(link(`${o.url}/absensi?tanggal=${o.date}`, "Buka dashboard"));
  return lines.join("\n");
}

export function statusMessage(o: { now: string; employees: Emp[]; sessions: Sess[] }) {
  const name = new Map(o.employees.map((e) => [e.id, e.name]));
  const inStore = o.sessions.filter((s) => !s.clock_out_at && s.status !== "perlu_koreksi");
  const done = o.sessions.filter((s) => s.clock_out_at && s.status !== "perlu_koreksi");
  const seen = new Set(o.sessions.map((s) => s.employee_id));
  const absent = o.employees.filter((e) => !seen.has(e.id));

  const lines = [`🏪 ${b(`Status ${fmtDate(o.now)}, ${fmtTime(o.now)}`)}`];
  if (!o.employees.length) return `${lines[0]}\nBelum ada karyawan aktif.`;
  if (inStore.length) lines.push(`Di toko (${inStore.length}): ${inStore.map((s) => `${esc(name.get(s.employee_id) ?? "?")} sejak ${fmtTime(s.clock_in_at)}`).join(", ")}`);
  if (done.length) lines.push(`Sudah pulang (${done.length}): ${done.map((s) => `${esc(name.get(s.employee_id) ?? "?")} ${fmtTime(s.clock_in_at)}–${fmtTime(s.clock_out_at!)}`).join(", ")}`);
  const noReturn = o.sessions.filter((s) => s.status === "perlu_koreksi");
  if (noReturn.length) lines.push(`Perlu koreksi (${noReturn.length}): ${noReturn.map((s) => esc(name.get(s.employee_id) ?? "?")).join(", ")}`);
  if (absent.length) lines.push(`Belum masuk (${absent.length}): ${absent.map((e) => esc(e.name)).join(", ")}`);
  return lines.join("\n");
}

export function rekapMessage(recap: Recap, month: string, url: string) {
  const lines = [`📊 ${b(`Rekap ${fmtMonth(month)}`)}`];
  if (!recap.rows.length) return `${lines[0]}\nBelum ada karyawan.`;
  for (const r of recap.rows) {
    lines.push(
      `• ${b(r.name)}: ${r.days} hari · ${dm(r.workMinutes)}${r.overtimeHours ? ` · lembur ${fmtHours(r.overtimeHours)} j` : ""}${r.flagged ? ` · koreksi ${r.flagged}` : ""}`,
    );
  }
  const t = recap.totals;
  lines.push(`Total: ${t.days} hari · ${dm(t.workMinutes)}${t.overtimeHours ? ` · lembur ${fmtHours(t.overtimeHours)} j` : ""}`);
  lines.push(link(`${url}/absensi/bulanan?bulan=${month}`, "Rincian dan unduh Excel"));
  return lines.join("\n");
}

// null = nothing to remind (payroll for the month is already locked).
export function payrollReminderMessage(o: {
  month: string; // YYYY-MM
  periods: { status: string }[];
  flagged: Flagged[];
  deductedLeaveMinutes: number;
  url: string;
}) {
  if (o.periods.length && o.periods.every((p) => p.status === "final")) return null;
  const state = o.periods.length ? "draft, belum dikunci" : "belum dihitung";
  const lines = [`💰 ${b(`Hari terakhir bulan, ${fmtMonth(o.month)}`)}`, `Gaji bulan ini: ${state}`];
  if (o.flagged.length) lines.push(flaggedLine(o.flagged));
  if (o.deductedLeaveMinutes) lines.push(`Izin dipotong bulan ini: ${esc(fmtLeave(o.deductedLeaveMinutes))}`);
  lines.push(o.flagged.length ? "Koreksi absensi dulu, lalu hitung gaji." : "Absensi sudah bersih. Siap menghitung gaji.");
  lines.push(link(`${o.url}/payroll`, "Buka payroll"));
  return lines.join("\n");
}

export function izinSavedMessage(o: { name: string; date: string; minutes: number; deducted: boolean; locked: boolean }) {
  const lines = [`✅ ${b("Izin dicatat")}`, `${esc(o.name)} · ${esc(fmtShortDate(noon(o.date)))} · ${esc(fmtLeave(o.minutes))} · ${o.deducted ? "dipotong" : "tidak dipotong"}`];
  if (o.locked) lines.push("⚠️ Payroll bulan itu sudah dikunci, jadi potongannya tidak ikut slip.");
  return lines.join("\n");
}

export function izinErrorMessage(r: Extract<ParsedIzin, { ok: false }>) {
  const lines = [`⚠️ ${esc(r.message)}`];
  if (r.options?.length) lines.push(`Pilihan: ${r.options.map(esc).join(", ")}`);
  if (r.reason !== "no-employee" && r.reason !== "ambiguous") lines.push("", izinUsage());
  return lines.join("\n");
}

export const izinUsage = () =>
  [
    "Format: /izin &lt;nama&gt; &lt;lama&gt; [kemarin|DD/MM] [dibayar] [catatan]",
    "Contoh:",
    "/izin Putri 2 jam sakit",
    "/izin Ivon seharian",
    "/izin Putri 30 menit kemarin urusan keluarga",
    "/izin Ivon 1,5 jam 28/9 dibayar",
  ].join("\n");

export const helpMessage = () =>
  [
    `🤖 ${b("Papawash")}`,
    "/status — siapa yang di toko sekarang",
    "/rekap — rekap bulan ini (atau: /rekap bulan lalu, /rekap 2026-09)",
    "/izin — catat izin karyawan",
    "",
    "Otomatis: peringatan 07:05 kalau belum ada yang absen, ringkasan 21:30, dan pengingat payroll di hari terakhir bulan.",
  ].join("\n");

export const unknownOwnerMessage = (id: number | string) =>
  `Telegram ID Anda: ${esc(String(id))}\nTambahkan angka ini ke TELEGRAM_OWNER_CHAT_ID di pengaturan aplikasi (pisahkan dengan koma bila ada lebih dari satu owner) untuk mengaktifkan bot.`;
