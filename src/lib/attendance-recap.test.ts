import { describe, expect, it } from "vitest";
import { buildRecap, type RecapSession } from "./attendance-recap";

const emps = [
  { id: "p", name: "Putri", active: true },
  { id: "i", name: "Ivon", active: true },
  { id: "x", name: "Mantan", active: false },
];
// WIB = UTC+7, so 09:00 WIB is 02:00Z
const s = (employee_id: string, inZ: string, outZ: string | null, status = "ok", note: string | null = null): RecapSession => ({
  employee_id,
  clock_in_at: `2026-09-${inZ}:00Z`,
  clock_out_at: outZ ? `2026-09-${outZ}:00Z` : null,
  status,
  correction_note: note,
});

describe("buildRecap", () => {
  it("counts days, work time and overtime with the payroll rules", () => {
    const r = buildRecap(emps, [
      s("p", "01T02:00", "01T12:30"), // 10h30 -> 1.5h overtime
      s("p", "02T02:00", "02T11:00"), // 9h -> 0
    ]);
    const putri = r.rows.find((x) => x.name === "Putri")!;
    expect(putri).toMatchObject({ days: 2, workMinutes: 630 + 540, overtimeHours: 1.5, flagged: 0 });
  });

  it("counts a flagged day as present but adds no hours or overtime", () => {
    const r = buildRecap(emps, [s("i", "03T02:00", "03T16:00", "perlu_koreksi")]);
    expect(r.rows.find((x) => x.name === "Ivon")).toMatchObject({ days: 1, workMinutes: 0, overtimeHours: 0, flagged: 1 });
    expect(r.details[0]).toMatchObject({ clockOut: null, workMinutes: null, overtimeHours: 0, status: "perlu_koreksi" });
  });

  it("counts two sessions on the same WIB date as one day", () => {
    // 20:00Z Sep 1 is 03:00 WIB Sep 2 (a shift past midnight stays with its own start day)
    const r = buildRecap(emps, [s("p", "01T02:00", "01T05:00"), s("p", "01T08:00", "01T10:00")]);
    expect(r.rows.find((x) => x.name === "Putri")!.days).toBe(1);
  });

  it("assigns a clock-in near midnight UTC to the right WIB date", () => {
    const r = buildRecap(emps, [s("p", "01T20:00", "02T05:00")]); // 03:00 WIB on the 2nd
    expect(r.details[0].employeeId).toBe("p");
    expect(r.details[0].date).toBe("2026-09-02");
    expect(r.details[0].clockIn).toBe("03:00");
  });

  it("lists active employees with zero, hides inactive ones without sessions, and totals", () => {
    const r = buildRecap(emps, [s("p", "01T02:00", "01T12:30")]);
    expect(r.rows.map((x) => x.name)).toEqual(["Ivon", "Putri"]); // sorted, Mantan hidden
    expect(r.rows.find((x) => x.name === "Ivon")).toMatchObject({ days: 0, workMinutes: 0 });
    expect(r.totals).toMatchObject({ days: 1, workMinutes: 630, overtimeHours: 1.5, flagged: 0 });
  });

  it("keeps an inactive employee who has sessions that month", () => {
    const r = buildRecap(emps, [s("x", "05T02:00", "05T11:00")]);
    expect(r.rows.map((x) => x.name)).toContain("Mantan");
  });
});
