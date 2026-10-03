export type IzinEmployee = { id: string; name: string };

export type ParsedIzin =
  | { ok: true; employee: IzinEmployee; date: string; minutes: number; deducted: boolean; note: string }
  | { ok: false; reason: "usage" | "no-employee" | "ambiguous" | "duration" | "date"; message: string; options?: string[] };

const MIN_MINUTES = 15;
const MAX_MINUTES = 24 * 60;
const FULL_DAY_MINUTES = 9 * 60;

const addDays = (date: string, days: number) => new Date(new Date(`${date}T00:00:00Z`).getTime() + days * 86_400_000).toISOString().slice(0, 10);

// "/izin <nama> <lama> [kemarin|DD/MM] [dibayar] [catatan]" (the part after the command).
export function parseIzin(input: string, employees: IzinEmployee[], today: string): ParsedIzin {
  const text = input.trim().replace(/\s+/g, " ");
  if (!text) return { ok: false, reason: "usage", message: "Tulis nama dan lama izin." };
  const tokens = text.split(" ");

  // 1. Employee: two words first ("Putri Ayu"), then the first word as a name prefix. An exact name wins over a
  //    longer name that starts the same way.
  const first = tokens[0].toLowerCase();
  let used = 1;
  let matches: IzinEmployee[] = [];
  if (tokens[1]) {
    const two = employees.filter((e) => e.name.toLowerCase().startsWith(`${first} ${tokens[1].toLowerCase()}`));
    if (two.length) {
      matches = two;
      used = 2;
    }
  }
  if (!matches.length) {
    matches = employees.filter((e) => e.name.toLowerCase().startsWith(first));
    const exact = matches.filter((e) => e.name.toLowerCase() === first);
    if (exact.length === 1) matches = exact;
  }
  if (!matches.length) {
    return { ok: false, reason: "no-employee", message: `Karyawan "${tokens[0]}" tidak ditemukan.`, options: employees.map((e) => e.name) };
  }
  if (matches.length > 1) {
    return { ok: false, reason: "ambiguous", message: `"${tokens[0]}" cocok dengan lebih dari satu karyawan. Tulis nama lebih lengkap.`, options: matches.map((e) => e.name) };
  }
  let rest = tokens.slice(used).join(" ");

  // 2. Duration
  let minutes: number | null = null;
  const take = (re: RegExp, toMinutes: (m: RegExpMatchArray) => number) => {
    const m = rest.match(re);
    if (!m) return false;
    minutes = toMinutes(m);
    rest = rest.replace(m[0], " ");
    return true;
  };
  const found =
    take(/\bseharian\b/i, () => FULL_DAY_MINUTES) ||
    take(/(\d+(?:[.,]\d+)?)\s*jam(?:\s*(\d+)\s*menit)?/i, (m) => Math.round(parseFloat(m[1].replace(",", ".")) * 60 + (m[2] ? parseInt(m[2], 10) : 0))) ||
    take(/(\d+)\s*menit/i, (m) => parseInt(m[1], 10));
  if (!found) minutes = null;
  if (minutes === null) return { ok: false, reason: "duration", message: "Lama izin tidak terbaca. Contoh: 2 jam, 1,5 jam, 30 menit, atau seharian." };
  if (minutes < MIN_MINUTES) return { ok: false, reason: "duration", message: "Lama izin minimal 15 menit." };
  if (minutes > MAX_MINUTES) return { ok: false, reason: "duration", message: "Lama izin tidak boleh lebih dari 24 jam." };

  // 3. Date: today by default, "kemarin", or DD/MM (or DD-MM) in the current year
  let date = today;
  if (/\bkemarin\b/i.test(rest)) {
    date = addDays(today, -1);
    rest = rest.replace(/\bkemarin\b/i, " ");
  }
  const dm = rest.match(/\b(\d{1,2})[/-](\d{1,2})\b/);
  if (dm) {
    const [d, m] = [parseInt(dm[1], 10), parseInt(dm[2], 10)];
    const iso = `${today.slice(0, 4)}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
    const real = new Date(`${iso}T00:00:00Z`);
    if (m < 1 || m > 12 || Number.isNaN(real.getTime()) || real.toISOString().slice(0, 10) !== iso) {
      return { ok: false, reason: "date", message: `Tanggal "${dm[0]}" tidak valid. Pakai format DD/MM, mis. 30/9.` };
    }
    date = iso;
    rest = rest.replace(dm[0], " ");
  }

  // 4. Paid leave marker, then whatever is left is the note
  let deducted = true;
  if (/\b(dibayar|tidak dipotong|gak dipotong|nggak dipotong)\b/i.test(rest)) {
    deducted = false;
    rest = rest.replace(/\b(dibayar|tidak dipotong|gak dipotong|nggak dipotong)\b/i, " ");
  }
  return { ok: true, employee: matches[0], date, minutes, deducted, note: rest.replace(/\s+/g, " ").trim() };
}
