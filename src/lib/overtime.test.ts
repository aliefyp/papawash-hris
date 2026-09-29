import { describe, expect, it } from "vitest";
import { overtimeHours } from "./overtime";

const at = (t: string) => `2026-09-29T${t}:00Z`;

describe("overtimeHours", () => {
  it("is 0 for exactly 9h or less", () => {
    expect(overtimeHours(at("01:00"), at("10:00"))).toBe(0);
    expect(overtimeHours(at("01:00"), at("08:00"))).toBe(0);
  });
  it("ignores under 15 minutes, counts from 15", () => {
    expect(overtimeHours(at("01:00"), at("10:14"))).toBe(0);
    expect(overtimeHours(at("01:00"), at("10:15"))).toBe(0.25);
  });
  it("uses decimal hours", () => {
    expect(overtimeHours(at("01:00"), at("12:30"))).toBe(2.5);
  });
  it("handles a shift across midnight", () => {
    expect(overtimeHours("2026-09-29T15:00:00Z", "2026-09-30T01:00:00Z")).toBe(1);
  });
});
