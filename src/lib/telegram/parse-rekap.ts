// "/rekap" argument -> month (YYYY-MM). Empty or "bulan ini" = this month, "bulan lalu" = previous, or "2026-09".
export function parseRekapMonth(arg: string, thisMonth: string): { ok: true; month: string } | { ok: false } {
  const a = arg.trim().toLowerCase().replace(/\s+/g, " ");
  if (!a || a === "bulan ini" || a === "ini") return { ok: true, month: thisMonth };
  if (a === "bulan lalu" || a === "lalu") {
    const [y, m] = thisMonth.split("-").map(Number);
    const d = new Date(Date.UTC(y, m - 2, 1));
    return { ok: true, month: `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}` };
  }
  if (/^\d{4}-(0[1-9]|1[0-2])$/.test(a)) return { ok: true, month: a };
  return { ok: false };
}
