import { describe, expect, it } from "vitest";
import { parseIzin } from "./parse-izin";

const emps = [
  { id: "p", name: "Putri" },
  { id: "i", name: "Ivon" },
  { id: "s", name: "Sinta" },
  { id: "pa", name: "Putri Ayu" },
];
const today = "2026-10-01";
const ok = (input: string) => {
  const r = parseIzin(input, emps, today);
  if (!r.ok) throw new Error(`${input}: ${r.message}`);
  return r;
};

describe("parseIzin: duration", () => {
  it.each([
    ["Ivon 2 jam sakit", 120],
    ["Ivon 1,5 jam", 90],
    ["Ivon 1.5 jam", 90],
    ["Ivon 30 menit", 30],
    ["Ivon 1 jam 30 menit", 90],
    ["Ivon 2jam", 120],
    ["Ivon seharian", 540],
    ["Ivon SEHARIAN", 540],
  ])("%s -> %i minutes", (input, minutes) => {
    expect(ok(input).minutes).toBe(minutes);
  });
  it("rejects too short, too long, and unreadable", () => {
    expect(parseIzin("Ivon 10 menit", emps, today)).toMatchObject({ ok: false, reason: "duration" });
    expect(parseIzin("Ivon 25 jam", emps, today)).toMatchObject({ ok: false, reason: "duration" });
    expect(parseIzin("Ivon sakit", emps, today)).toMatchObject({ ok: false, reason: "duration" });
  });
});

describe("parseIzin: employee", () => {
  it("matches a prefix, ignoring case", () => {
    expect(ok("siN 1 jam").employee.id).toBe("s");
  });
  it("prefers an exact name over a longer one that starts the same", () => {
    expect(ok("putri 1 jam").employee.id).toBe("p");
  });
  it("uses a second word to pick between similar names", () => {
    expect(ok("putri ayu 1 jam sakit").employee.id).toBe("pa");
  });
  it("asks when it cannot tell, and lists names when none match", () => {
    const amb = parseIzin("pu 1 jam", emps, today);
    expect(amb).toMatchObject({ ok: false, reason: "ambiguous" });
    const none = parseIzin("Budi 1 jam", emps, today);
    expect(none).toMatchObject({ ok: false, reason: "no-employee" });
    if (!none.ok) expect(none.options).toContain("Ivon");
  });
});

describe("parseIzin: date, paid flag, note", () => {
  it("defaults to today, supports kemarin and DD/MM", () => {
    expect(ok("Ivon 1 jam").date).toBe("2026-10-01");
    expect(ok("Ivon 1 jam kemarin").date).toBe("2026-09-30");
    expect(ok("Ivon 1 jam 28/9").date).toBe("2026-09-28");
    expect(ok("Ivon 1 jam 5-10").date).toBe("2026-10-05");
  });
  it("rejects an impossible date", () => {
    expect(parseIzin("Ivon 1 jam 31/2", emps, today)).toMatchObject({ ok: false, reason: "date" });
  });
  it("is deducted unless marked as paid", () => {
    expect(ok("Ivon 1 jam").deducted).toBe(true);
    expect(ok("Ivon 1 jam dibayar").deducted).toBe(false);
    expect(ok("Ivon seharian tidak dipotong sakit").deducted).toBe(false);
  });
  it("keeps what is left as the note", () => {
    const r = ok("Putri 30 menit kemarin urusan keluarga");
    expect(r).toMatchObject({ minutes: 30, date: "2026-09-30", note: "urusan keluarga" });
    expect(ok("Ivon 2 jam").note).toBe("");
  });
  it("shows usage for an empty message", () => {
    expect(parseIzin("   ", emps, today)).toMatchObject({ ok: false, reason: "usage" });
  });
});
