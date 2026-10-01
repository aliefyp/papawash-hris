import { describe, expect, it } from "vitest";
import { sheetName } from "./sheet-name";

describe("sheetName", () => {
  it("keeps a normal name", () => {
    expect(sheetName("Putri", new Set())).toBe("Putri");
  });
  it("removes characters Excel forbids", () => {
    expect(sheetName("Ivon/Siti: [A]?*", new Set())).toBe("Ivon Siti A");
  });
  it("cuts to 31 characters", () => {
    expect(sheetName("A".repeat(40), new Set())).toHaveLength(31);
  });
  it("never repeats a name, ignoring case, and keeps the reserved one free", () => {
    const used = new Set(["rekap"]);
    expect(sheetName("Rekap", used)).toBe("Rekap (2)");
    expect(sheetName("putri", used)).toBe("putri");
    expect(sheetName("Putri", used)).toBe("Putri (2)");
    expect(sheetName("PUTRI", used)).toBe("PUTRI (3)");
  });
  it("stays within 31 characters when it adds a suffix", () => {
    const used = new Set<string>();
    sheetName("B".repeat(31), used);
    expect(sheetName("B".repeat(31), used)).toHaveLength(31);
  });
  it("falls back for a blank name", () => {
    expect(sheetName("  ", new Set())).toBe("Karyawan");
  });
});
