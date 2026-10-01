import { describe, expect, it } from "vitest";
import { fmtLeave, leaveDeduction } from "./leave";

describe("leaveDeduction", () => {
  it("is base salary / 234 hours per hour taken, rounded to whole rupiah", () => {
    // 1.750.000 / 234 * 12 = 89.743,59
    expect(leaveDeduction(1_750_000, 12 * 60)).toBe(89_744);
  });
  it("handles partial hours and zero", () => {
    expect(leaveDeduction(2_340_000, 90)).toBe(15_000); // 10.000/jam * 1,5
    expect(leaveDeduction(1_750_000, 0)).toBe(0);
  });
});

describe("fmtLeave", () => {
  it("writes hours and minutes", () => {
    expect(fmtLeave(150)).toBe("2 jam 30 menit");
    expect(fmtLeave(45)).toBe("45 menit");
    expect(fmtLeave(540)).toBe("9 jam");
  });
});
