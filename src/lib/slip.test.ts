import { describe, expect, it } from "vitest";
import { buildSlipData, slipFileName } from "./slip";

describe("buildSlipData", () => {
  it("splits earnings and deductions in order and totals like the spreadsheet slip", () => {
    const d = buildSlipData({
      employeeName: "Putri",
      outletName: "Solo",
      month: "2026-09",
      finalizedAt: null,
      items: [
        { name: "Cicilan Pinjaman", kind: "deduction", amount: 1_750_000, sort_order: 4 },
        { name: "Kesehatan", kind: "earning", amount: 35_000, sort_order: 3 },
        { name: "Gaji Pokok", kind: "earning", amount: 1_750_000, sort_order: 0 },
        { name: "Bonus Lembur (12 jam)", kind: "earning", amount: 240_000, sort_order: 1 },
        { name: "Bonus Performa", kind: "earning", amount: 50_000, sort_order: 2 },
      ],
    });
    expect(d.earnings.map((e) => e.name)).toEqual(["Gaji Pokok", "Bonus Lembur (12 jam)", "Bonus Performa", "Kesehatan"]);
    expect(d.deductions).toEqual([{ name: "Cicilan Pinjaman", amount: 1_750_000 }]);
    expect(d.net).toBe(325_000);
  });

  it("makes a safe file name", () => {
    expect(slipFileName({ employeeName: "Putri Ayu/../x", month: "2026-09" })).toBe("Slip-Gaji-Putri-Ayu-x-2026-09.pdf");
  });
});
