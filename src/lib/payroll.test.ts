import { describe, expect, it } from "vitest";
import { autoItems, totals } from "./payroll";

describe("autoItems", () => {
  it("has base salary only when no overtime or loans", () => {
    const items = autoItems({ baseSalary: 1_750_000, overtimeRate: 20_000, overtimeHours: 0, loans: [] });
    expect(items).toEqual([{ name: "Gaji Pokok", kind: "earning", amount: 1_750_000, source: "auto" }]);
  });

  it("pays overtime hours x rate, rounded to whole rupiah", () => {
    const items = autoItems({ baseSalary: 0, overtimeRate: 20_000, overtimeHours: 12, loans: [] });
    expect(items[1].amount).toBe(240_000);
    expect(autoItems({ baseSalary: 0, overtimeRate: 10_001, overtimeHours: 0.25, loans: [] })[1].amount).toBe(2_500);
  });

  it("caps the installment at the remaining balance and skips paid-off loans", () => {
    const items = autoItems({
      baseSalary: 0,
      overtimeRate: 0,
      overtimeHours: 0,
      loans: [
        { id: "a", monthly_installment: 500_000, remaining: 300_000 },
        { id: "b", monthly_installment: 500_000, remaining: 0 },
      ],
    });
    const deductions = items.filter((i) => i.kind === "deduction");
    expect(deductions).toHaveLength(1);
    expect(deductions[0]).toMatchObject({ loan_id: "a", amount: 300_000 });
  });
});

describe("autoItems with unpaid leave", () => {
  it("adds one deduction item between overtime and loans", () => {
    const items = autoItems({
      baseSalary: 1_750_000,
      overtimeRate: 20_000,
      overtimeHours: 2.5,
      leaveMinutes: 12 * 60,
      loans: [{ id: "a", monthly_installment: 100_000, remaining: 500_000 }],
    });
    expect(items.map((i) => i.name)).toEqual([
      "Gaji Pokok",
      "Bonus Lembur (2,5 jam)",
      "Potongan izin (12 jam)",
      "Cicilan Pinjaman",
    ]);
    expect(items[2]).toMatchObject({ kind: "deduction", amount: 89_744, source: "auto" });
  });
  it("adds nothing when there is no deducted leave", () => {
    const items = autoItems({ baseSalary: 1_750_000, overtimeRate: 0, overtimeHours: 0, loans: [] });
    expect(items).toHaveLength(1);
  });
});

describe("totals", () => {
  it("nets deductions from earnings, like the current spreadsheet slip", () => {
    // Gaji 1.750.000 + lembur 240.000 + performa 50.000 + kesehatan 35.000 - pinjaman 1.750.000
    const t = totals([
      { kind: "earning", amount: 1_750_000 },
      { kind: "earning", amount: 240_000 },
      { kind: "earning", amount: 50_000 },
      { kind: "earning", amount: 35_000 },
      { kind: "deduction", amount: 1_750_000 },
    ]);
    expect(t).toEqual({ earnings: 2_075_000, deductions: 1_750_000, net: 325_000 });
  });
});
