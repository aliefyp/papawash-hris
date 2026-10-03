import { describe, expect, it } from "vitest";
import { parseRekapMonth } from "./parse-rekap";

describe("parseRekapMonth", () => {
  it("defaults to this month", () => {
    expect(parseRekapMonth("", "2026-10")).toEqual({ ok: true, month: "2026-10" });
    expect(parseRekapMonth("bulan ini", "2026-10")).toEqual({ ok: true, month: "2026-10" });
  });
  it("goes back one month, across the year boundary too", () => {
    expect(parseRekapMonth("bulan lalu", "2026-10")).toEqual({ ok: true, month: "2026-09" });
    expect(parseRekapMonth("Bulan   Lalu", "2027-01")).toEqual({ ok: true, month: "2026-12" });
  });
  it("accepts YYYY-MM and rejects anything else", () => {
    expect(parseRekapMonth("2026-03", "2026-10")).toEqual({ ok: true, month: "2026-03" });
    expect(parseRekapMonth("2026-13", "2026-10")).toEqual({ ok: false });
    expect(parseRekapMonth("maret", "2026-10")).toEqual({ ok: false });
  });
});
