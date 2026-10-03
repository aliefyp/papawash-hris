import { describe, expect, it } from "vitest";
import { correctionNote, hasChanged, validateTimes } from "./correction";

const now = new Date("2026-10-01T10:00:00Z");
const t = (s: string) => new Date(`2026-10-01T${s}:00Z`);

describe("validateTimes", () => {
  it("accepts a normal closed session", () => {
    expect(validateTimes({ clockIn: t("02:00"), clockOut: t("09:00"), now, requireOut: true })).toBeNull();
  });
  it("accepts an open session when the clock-out is optional", () => {
    expect(validateTimes({ clockIn: t("04:49"), clockOut: null, now, requireOut: false })).toBeNull();
  });
  it("requires a clock-out when asked", () => {
    expect(validateTimes({ clockIn: t("02:00"), clockOut: null, now, requireOut: true })).toBe("Isi jam pulang.");
  });
  it("needs a clock-in", () => {
    expect(validateTimes({ clockIn: null, clockOut: null, now, requireOut: false })).toBe("Isi jam masuk.");
  });
  it("rejects times in the future", () => {
    expect(validateTimes({ clockIn: t("11:00"), clockOut: null, now, requireOut: false })).toBe("Jam masuk tidak boleh di masa depan.");
    expect(validateTimes({ clockIn: t("02:00"), clockOut: t("12:00"), now, requireOut: true })).toBe("Jam pulang tidak boleh di masa depan.");
  });
  it("rejects a clock-out that is not after the clock-in", () => {
    expect(validateTimes({ clockIn: t("05:00"), clockOut: t("05:00"), now, requireOut: true })).toBe("Jam pulang harus setelah jam masuk.");
  });
  it("refuses to leave a session open for more than the 16 hour limit", () => {
    const msg = validateTimes({ clockIn: new Date("2026-09-30T17:00:00Z"), clockOut: null, now, requireOut: false }); // 17 h ago
    expect(msg).toContain("lebih dari 16 jam");
  });
  it("allows an open session right up to the limit (a 07:00 to 21:00 day)", () => {
    expect(validateTimes({ clockIn: new Date("2026-09-30T18:30:00Z"), clockOut: null, now, requireOut: false })).toBeNull(); // 15.5 h ago
  });
});

describe("correctionNote", () => {
  const fmt = (iso: string) => iso.slice(11, 16);
  it("lists only what changed, after the reason", () => {
    const note = correctionNote(
      "Salah ketuk",
      { in: "2026-10-01T08:10:00Z", out: null },
      { in: "2026-10-01T04:49:00Z", out: null },
      fmt,
    );
    expect(note).toBe("Salah ketuk · masuk 08:10 → 04:49");
  });
  it("describes a newly added clock-out", () => {
    const note = correctionNote(
      "Lupa absen pulang",
      { in: "2026-10-01T02:00:00Z", out: null },
      { in: "2026-10-01T02:00:00Z", out: "2026-10-01T11:00:00Z" },
      fmt,
    );
    expect(note).toBe("Lupa absen pulang · pulang belum ada → 11:00");
  });
  it("detects no change", () => {
    const a = { in: "x", out: null };
    expect(hasChanged(a, { ...a })).toBe(false);
    expect(hasChanged(a, { in: "y", out: null })).toBe(true);
  });
});
