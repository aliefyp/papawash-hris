import { describe, expect, it } from "vitest";
import { buildRecap } from "../attendance-recap";
import { daySummaryMessage, esc, izinSavedMessage, payrollReminderMessage, rekapMessage, statusMessage } from "./messages";

const emps = [
  { id: "p", name: "Putri" },
  { id: "i", name: "Ivon" },
  { id: "s", name: "Sinta" },
];
// 09:00 WIB = 02:00Z
const sess = (id: string, inH: string, outH: string | null, status = "ok") => ({
  employee_id: id,
  clock_in_at: `2026-10-01T${inH}:00Z`,
  clock_out_at: outH ? `2026-10-01T${outH}:00Z` : null,
  status,
});
const url = "https://x.test";

describe("daySummaryMessage", () => {
  it("lists each employee with hours, open sessions, and absentees", () => {
    const m = daySummaryMessage({
      date: "2026-10-01",
      employees: emps,
      sessions: [sess("p", "00:04", "10:02"), sess("i", "04:49", null)],
      leaves: [{ employee_id: "p", minutes: 120, deducted: true }],
      flagged: [{ name: "Ivon", clock_in_at: "2026-09-29T02:00:00Z" }],
      url,
    });
    expect(m).toContain("Ringkasan Kamis, 1 Oktober");
    expect(m).toContain("<b>Putri</b>: 07:04–17:02 (9 j 58 m)");
    expect(m).toContain("<b>Ivon</b>: 11:49 – belum pulang");
    expect(m).toContain("<b>Sinta</b>: tidak masuk");
    expect(m).toContain("Izin hari ini: Putri 2 jam (dipotong)");
    expect(m).toContain("Perlu koreksi: 1 hari (Ivon · 29 Sep)");
    expect(m).toContain(`${url}/absensi?tanggal=2026-10-01`);
  });
  it("shows overtime using the payroll rule (30 minute threshold)", () => {
    const m = daySummaryMessage({ date: "2026-10-01", employees: emps, sessions: [sess("p", "02:00", "12:30")], leaves: [], flagged: [], url });
    expect(m).toContain("lembur 1,5 j");
  });
  it("says so when nobody came, and when a clock-out is missing", () => {
    expect(daySummaryMessage({ date: "2026-10-01", employees: emps, sessions: [], leaves: [], flagged: [], url })).toContain("Tidak ada absensi hari ini.");
    const m = daySummaryMessage({ date: "2026-10-01", employees: emps, sessions: [sess("i", "02:00", "16:00", "perlu_koreksi")], leaves: [], flagged: [], url });
    expect(m).toContain("jam pulang belum diisi");
  });
  it("escapes names", () => {
    const m = daySummaryMessage({ date: "2026-10-01", employees: [{ id: "x", name: "A<b>&B" }], sessions: [sess("x", "02:00", "11:00")], leaves: [], flagged: [], url });
    expect(m).toContain("A&lt;b&gt;&amp;B");
    expect(esc("<")).toBe("&lt;");
  });
});

describe("statusMessage", () => {
  it("groups people by where they are", () => {
    const m = statusMessage({
      now: "2026-10-01T08:30:00Z",
      employees: emps,
      sessions: [sess("p", "00:04", null), sess("i", "02:00", "07:00")],
    });
    expect(m).toContain("Status Kamis, 1 Oktober, 15:30");
    expect(m).toContain("Di toko (1): Putri sejak 07:04");
    expect(m).toContain("Sudah pulang (1): Ivon 09:00–14:00");
    expect(m).toContain("Belum masuk (1): Sinta");
  });
});

describe("rekapMessage", () => {
  it("summarises the month per employee with a total", () => {
    const recap = buildRecap(
      emps.map((e) => ({ ...e, active: true })),
      [{ employee_id: "p", clock_in_at: "2026-10-01T02:00:00Z", clock_out_at: "2026-10-01T12:30:00Z", status: "ok", correction_note: null }],
    );
    const m = rekapMessage(recap, "2026-10", url);
    expect(m).toContain("Rekap Oktober 2026");
    expect(m).toContain("<b>Putri</b>: 1 hari · 10 j 30 m · lembur 1,5 j");
    expect(m).toContain("<b>Sinta</b>: 0 hari");
    expect(m).toContain(`${url}/absensi/bulanan?bulan=2026-10`);
  });
});

describe("payrollReminderMessage", () => {
  const base = { month: "2026-10", flagged: [], deductedLeaveMinutes: 0, url };
  it("is silent when payroll is already locked", () => {
    expect(payrollReminderMessage({ ...base, periods: [{ status: "final" }] })).toBeNull();
  });
  it("reports not calculated, draft, corrections and leave", () => {
    expect(payrollReminderMessage({ ...base, periods: [] })).toContain("belum dihitung");
    expect(payrollReminderMessage({ ...base, periods: [{ status: "draft" }] })).toContain("draft, belum dikunci");
    const m = payrollReminderMessage({ ...base, periods: [], flagged: [{ name: "Ivon", clock_in_at: "2026-09-29T02:00:00Z" }], deductedLeaveMinutes: 300 });
    expect(m).toContain("Perlu koreksi: 1 hari");
    expect(m).toContain("Izin dipotong bulan ini: 5 jam");
    expect(m).toContain("Koreksi absensi dulu");
  });
});

describe("izinSavedMessage", () => {
  it("confirms and warns about a locked month", () => {
    const m = izinSavedMessage({ name: "Putri", date: "2026-10-01", minutes: 120, deducted: true, locked: true });
    expect(m).toContain("Putri · 1 Okt · 2 jam · dipotong");
    expect(m).toContain("sudah dikunci");
  });
});
