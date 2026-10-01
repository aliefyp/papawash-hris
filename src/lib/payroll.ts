import { fmtHours } from "./format";
import { leaveDeduction } from "./leave";

export type Item = {
  name: string;
  kind: "earning" | "deduction";
  amount: number;
  source: "auto" | "manual";
  loan_id?: string;
};

export type LoanInput = { id: string; monthly_installment: number; remaining: number };

// Auto items for one employee-month: base salary, overtime pay, unpaid-leave deduction, one installment per active loan.
export function autoItems(o: {
  baseSalary: number;
  overtimeRate: number;
  overtimeHours: number;
  leaveMinutes?: number; // only leave marked "dipotong"
  loans: LoanInput[];
}): Item[] {
  const items: Item[] = [{ name: "Gaji Pokok", kind: "earning", amount: o.baseSalary, source: "auto" }];
  const overtimePay = Math.round(o.overtimeHours * o.overtimeRate);
  if (overtimePay > 0) {
    items.push({ name: `Bonus Lembur (${fmtHours(o.overtimeHours)} jam)`, kind: "earning", amount: overtimePay, source: "auto" });
  }
  const leavePay = leaveDeduction(o.baseSalary, o.leaveMinutes ?? 0);
  if (leavePay > 0) {
    items.push({
      name: `Potongan izin (${fmtHours((o.leaveMinutes ?? 0) / 60)} jam)`,
      kind: "deduction",
      amount: leavePay,
      source: "auto",
    });
  }
  for (const l of o.loans) {
    const amount = Math.min(l.monthly_installment, l.remaining);
    if (amount > 0) {
      items.push({ name: "Cicilan Pinjaman", kind: "deduction", amount, source: "auto", loan_id: l.id });
    }
  }
  return items;
}

export function totals(items: Pick<Item, "kind" | "amount">[]) {
  const earnings = items.filter((i) => i.kind === "earning").reduce((s, i) => s + i.amount, 0);
  const deductions = items.filter((i) => i.kind === "deduction").reduce((s, i) => s + i.amount, 0);
  return { earnings, deductions, net: earnings - deductions };
}
