export const TZ = "Asia/Jakarta"; // WIB is UTC+7 all year, no DST
const OFFSET = "+07:00";

export const todayWib = () => new Date().toLocaleDateString("en-CA", { timeZone: TZ }); // YYYY-MM-DD

export function wibDayRange(date: string) {
  const start = new Date(`${date}T00:00:00${OFFSET}`);
  return { from: start.toISOString(), to: new Date(start.getTime() + 86_400_000).toISOString() };
}

// "2026-09-29T17:30" (datetime-local, read as WIB) -> ISO UTC
export const wibToIso = (local: string) => new Date(`${local}:00${OFFSET}`).toISOString();

export const fmtTime = (iso: string | Date) =>
  new Date(iso).toLocaleTimeString("id-ID", { timeZone: TZ, hour: "2-digit", minute: "2-digit" }).replace(".", ":");

export const fmtDate = (iso: string | Date) =>
  new Date(iso).toLocaleDateString("id-ID", { timeZone: TZ, weekday: "long", day: "numeric", month: "long" });

export const fmtRp = (n: number) => `Rp${n.toLocaleString("id-ID")}`;

export const fmtDuration = (from: string, to: string) => {
  const min = Math.round((new Date(to).getTime() - new Date(from).getTime()) / 60_000);
  return `${Math.floor(min / 60)}j ${String(min % 60).padStart(2, "0")}m`;
};

// "2026-09" -> [start of Sept, start of Oct) in WIB, as ISO UTC
export function wibMonthRange(month: string) {
  const [y, m] = month.split("-").map(Number);
  const next = m === 12 ? `${y + 1}-01` : `${y}-${String(m + 1).padStart(2, "0")}`;
  return {
    from: new Date(`${month}-01T00:00:00${OFFSET}`).toISOString(),
    to: new Date(`${next}-01T00:00:00${OFFSET}`).toISOString(),
  };
}

export const fmtMonth = (month: string) =>
  new Date(`${month}-01T12:00:00${OFFSET}`).toLocaleDateString("id-ID", { timeZone: TZ, month: "long", year: "numeric" });

// ISO -> "YYYY-MM-DDTHH:mm" in WIB (value for <input type="datetime-local">), optionally shifted
export const wibLocalInput = (iso: string, plusHours = 0) =>
  new Date(new Date(iso).getTime() + (7 + plusHours) * 3_600_000).toISOString().slice(0, 16);

export const fmtShortDate = (iso: string) =>
  new Date(iso).toLocaleDateString("id-ID", { timeZone: TZ, day: "numeric", month: "short" });
