import { overtimeHours } from "./overtime";

export type RecapEmployee = { id: string; name: string; active: boolean };
export type RecapSession = {
  employee_id: string;
  clock_in_at: string;
  clock_out_at: string | null;
  status: string; // ok | perlu_koreksi | dikoreksi
  correction_note: string | null;
};

export type RecapRow = { employeeId: string; name: string; days: number; workMinutes: number; overtimeHours: number; flagged: number };
export type DetailRow = {
  employeeId: string;
  date: string; // YYYY-MM-DD, WIB
  employeeName: string;
  clockIn: string; // HH:mm WIB
  clockOut: string | null;
  workMinutes: number | null;
  overtimeHours: number;
  status: string;
  note: string | null;
};
export type Recap = { rows: RecapRow[]; totals: Omit<RecapRow, "employeeId" | "name">; details: DetailRow[] };

const WIB_MS = 7 * 3_600_000; // WIB is UTC+7 all year
const wib = (iso: string) => new Date(new Date(iso).getTime() + WIB_MS).toISOString(); // shifted so UTC fields read as WIB
const wibDate = (iso: string) => wib(iso).slice(0, 10);
const wibTime = (iso: string) => wib(iso).slice(11, 16);

// Same rules as payroll: a "perlu_koreksi" day has no trusted clock-out, so it counts as a day present
// but adds no work hours and no overtime.
export function buildRecap(employees: RecapEmployee[], sessions: RecapSession[]): Recap {
  const byEmployee = new Map<string, RecapSession[]>();
  for (const s of sessions) byEmployee.set(s.employee_id, [...(byEmployee.get(s.employee_id) ?? []), s]);

  const rows: RecapRow[] = employees
    .filter((e) => e.active || byEmployee.has(e.id))
    .map((e) => {
      const own = byEmployee.get(e.id) ?? [];
      const counted = own.filter((s) => s.clock_out_at && s.status !== "perlu_koreksi");
      return {
        employeeId: e.id,
        name: e.name,
        days: new Set(own.map((s) => wibDate(s.clock_in_at))).size,
        workMinutes: counted.reduce(
          (sum, s) => sum + Math.round((new Date(s.clock_out_at!).getTime() - new Date(s.clock_in_at).getTime()) / 60_000),
          0,
        ),
        overtimeHours: Math.round(counted.reduce((sum, s) => sum + overtimeHours(s.clock_in_at, s.clock_out_at!), 0) * 100) / 100,
        flagged: own.filter((s) => s.status === "perlu_koreksi").length,
      };
    })
    .sort((a, b) => a.name.localeCompare(b.name, "id"));

  const totals = {
    days: rows.reduce((s, r) => s + r.days, 0),
    workMinutes: rows.reduce((s, r) => s + r.workMinutes, 0),
    overtimeHours: Math.round(rows.reduce((s, r) => s + r.overtimeHours, 0) * 100) / 100,
    flagged: rows.reduce((s, r) => s + r.flagged, 0),
  };

  const names = new Map(employees.map((e) => [e.id, e.name]));
  const details: DetailRow[] = [...sessions]
    .sort((a, b) => a.clock_in_at.localeCompare(b.clock_in_at))
    .map((s) => {
      const counted = !!s.clock_out_at && s.status !== "perlu_koreksi";
      return {
        employeeId: s.employee_id,
        date: wibDate(s.clock_in_at),
        employeeName: names.get(s.employee_id) ?? "",
        clockIn: wibTime(s.clock_in_at),
        clockOut: s.clock_out_at && s.status !== "perlu_koreksi" ? wibTime(s.clock_out_at) : null,
        workMinutes: counted ? Math.round((new Date(s.clock_out_at!).getTime() - new Date(s.clock_in_at).getTime()) / 60_000) : null,
        overtimeHours: counted ? overtimeHours(s.clock_in_at, s.clock_out_at!) : 0,
        status: s.status,
        note: s.correction_note,
      };
    });

  return { rows, totals, details };
}
