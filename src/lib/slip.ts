export type SlipItem = { name: string; kind: string; amount: number; sort_order: number };

export type SlipData = {
  employeeName: string;
  outletName: string;
  month: string; // YYYY-MM
  finalizedAt: string | null;
  earnings: { name: string; amount: number }[];
  deductions: { name: string; amount: number }[];
  net: number;
};

// Splits a payslip's items into the two sections of the printed slip (penerimaan / pengeluaran).
export function buildSlipData(o: {
  employeeName: string;
  outletName: string;
  month: string;
  finalizedAt: string | null;
  items: SlipItem[];
}): SlipData {
  const sorted = [...o.items].sort((a, b) => a.sort_order - b.sort_order);
  const pick = (kind: string) => sorted.filter((i) => i.kind === kind).map((i) => ({ name: i.name, amount: i.amount }));
  const earnings = pick("earning");
  const deductions = pick("deduction");
  const sum = (l: { amount: number }[]) => l.reduce((s, i) => s + i.amount, 0);
  return {
    employeeName: o.employeeName,
    outletName: o.outletName,
    month: o.month,
    finalizedAt: o.finalizedAt,
    earnings,
    deductions,
    net: sum(earnings) - sum(deductions),
  };
}

export const slipFileName = (d: Pick<SlipData, "employeeName" | "month">) =>
  `Slip-Gaji-${d.employeeName.replace(/[^\w-]+/g, "-")}-${d.month}.pdf`;
