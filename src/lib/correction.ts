import { MAX_OPEN_HOURS, MAX_OPEN_MS } from "./attendance-rules";
const FUTURE_SLACK_MS = 5 * 60_000;

// Returns an error message for the admin, or null when the corrected times are acceptable.
export function validateTimes(o: { clockIn: Date | null; clockOut: Date | null; now: Date; requireOut: boolean }): string | null {
  const { clockIn, clockOut, now } = o;
  if (!clockIn) return "Isi jam masuk.";
  if (o.requireOut && !clockOut) return "Isi jam pulang.";
  if (clockIn.getTime() > now.getTime() + FUTURE_SLACK_MS) return "Jam masuk tidak boleh di masa depan.";
  if (clockOut) {
    if (clockOut.getTime() > now.getTime() + FUTURE_SLACK_MS) return "Jam pulang tidak boleh di masa depan.";
    if (clockOut.getTime() <= clockIn.getTime()) return "Jam pulang harus setelah jam masuk.";
  } else if (now.getTime() - clockIn.getTime() > MAX_OPEN_MS) {
    return `Isi jam pulang juga: sudah lebih dari ${MAX_OPEN_HOURS} jam sejak jam masuk, jadi sesi ini tidak bisa dibiarkan terbuka.`;
  }
  return null;
}

type Times = { in: string; out: string | null };

// "Lupa absen pulang · masuk 15:10 → 11:49 · pulang belum ada → 17:00". Only the parts that changed.
export function correctionNote(reason: string, before: Times, after: Times, fmt: (iso: string) => string): string {
  const parts: string[] = [];
  if (before.in !== after.in) parts.push(`masuk ${fmt(before.in)} → ${fmt(after.in)}`);
  if (before.out !== after.out) {
    parts.push(`pulang ${before.out ? fmt(before.out) : "belum ada"} → ${after.out ? fmt(after.out) : "belum ada"}`);
  }
  return [reason.trim(), ...parts].filter(Boolean).join(" · ");
}

export const hasChanged = (before: Times, after: Times) => before.in !== after.in || before.out !== after.out;
