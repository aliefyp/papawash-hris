import "server-only";
import { sha256 } from "@/lib/device";
import { buildSlipData, type SlipData, type SlipItem } from "@/lib/slip";
import { adminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

const SELECT =
  "id, employee_name, share_expires_at, payroll_periods!inner(id, month, status, finalized_at, outlets(name)), payslip_items(name, kind, amount, sort_order)";

type Row = {
  id: string;
  employee_name: string;
  share_expires_at: string | null;
  payroll_periods: { id: string; month: string; status: string; finalized_at: string | null; outlets: { name: string } | null };
  payslip_items: SlipItem[];
};

function toSlip(r: Row): SlipData {
  return buildSlipData({
    employeeName: r.employee_name,
    outletName: r.payroll_periods.outlets?.name ?? "",
    month: r.payroll_periods.month.slice(0, 7),
    finalizedAt: r.payroll_periods.finalized_at,
    items: r.payslip_items,
  });
}

// Owner side (RLS applies): only slips of a locked period.
export async function loadSlipForOwner(periodId: string, slipId: string): Promise<SlipData | null> {
  const db = await createClient();
  const { data } = await db.from("payslips").select(SELECT).eq("id", slipId).eq("period_id", periodId).maybeSingle();
  const row = data as unknown as Row | null;
  return row && row.payroll_periods.status === "final" ? toSlip(row) : null;
}

// Employee side: no login. The random token is the credential; only its hash is stored.
export async function loadSlipByToken(token: string): Promise<SlipData | null> {
  const { data } = await adminClient().from("payslips").select(SELECT).eq("share_token_hash", sha256(token)).maybeSingle();
  const row = data as unknown as Row | null;
  if (!row || row.payroll_periods.status !== "final") return null;
  if (!row.share_expires_at || new Date(row.share_expires_at).getTime() < new Date().getTime()) return null;
  return toSlip(row);
}
