"use server";

import { randomBytes } from "node:crypto";
import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import type { ActionState } from "@/lib/action-state";
import { createClient } from "@/lib/supabase/server";
import { sha256 } from "@/lib/device";
import { monthDateRange, wibMonthRange } from "@/lib/format";
import { overtimeHours } from "@/lib/overtime";
import { autoItems, totals } from "@/lib/payroll";

type Db = Awaited<ReturnType<typeof createClient>>;

async function recalc(db: Db, payslipId: string) {
  const { data: items } = await db.from("payslip_items").select("kind, amount").eq("payslip_id", payslipId);
  const t = totals(items ?? []);
  await db
    .from("payslips")
    .update({ total_earnings: t.earnings, total_deductions: t.deductions, net_pay: t.net })
    .eq("id", payslipId);
}

// Creates the period if needed, then (re)builds every auto item. Manual items are kept.
export async function generatePayroll(formData: FormData) {
  const month = String(formData.get("month")); // YYYY-MM
  const outletId = String(formData.get("outlet_id"));
  if (!/^\d{4}-\d{2}$/.test(month) || !outletId) return;

  const db = await createClient();
  const { from, to } = wibMonthRange(month);

  const { count: flagged } = await db
    .from("attendance_sessions")
    .select("id", { count: "exact", head: true })
    .eq("outlet_id", outletId)
    .eq("status", "perlu_koreksi")
    .gte("clock_in_at", from)
    .lt("clock_in_at", to);
  if (flagged) redirect(`/payroll?error=koreksi&n=${flagged}`);

  let { data: period } = await db
    .from("payroll_periods")
    .select("id, status")
    .eq("outlet_id", outletId)
    .eq("month", `${month}-01`)
    .maybeSingle();
  if (period?.status === "final") redirect(`/payroll/${period.id}`);
  if (!period) {
    ({ data: period } = await db
      .from("payroll_periods")
      .insert({ outlet_id: outletId, month: `${month}-01` })
      .select("id, status")
      .single());
  }
  if (!period) redirect("/payroll?error=gagal");

  const dates = monthDateRange(month);
  const [{ data: employees }, { data: sessions }, { data: loans }, leaves] = await Promise.all([
    db.from("employees").select("id, name, base_salary, overtime_rate_per_hour").eq("outlet_id", outletId).eq("active", true),
    db
      .from("attendance_sessions")
      .select("employee_id, clock_in_at, clock_out_at")
      .eq("outlet_id", outletId)
      .not("clock_out_at", "is", null)
      .gte("clock_in_at", from)
      .lt("clock_in_at", to),
    db.from("loans").select("id, employee_id, monthly_installment, remaining").gt("remaining", 0),
    db
      .from("leaves")
      .select("employee_id, minutes")
      .eq("outlet_id", outletId)
      .eq("deducted", true)
      .gte("leave_date", dates.from)
      .lt("leave_date", dates.to),
  ]);
  // Without the leaves table (migration not run) we must not silently skip deductions.
  if (leaves.error) redirect("/payroll?error=izin");

  for (const e of employees ?? []) {
    const hours = (sessions ?? [])
      .filter((s) => s.employee_id === e.id)
      .reduce((sum, s) => sum + overtimeHours(s.clock_in_at, s.clock_out_at!), 0);
    const { data: slip } = await db
      .from("payslips")
      .upsert({ period_id: period.id, employee_id: e.id, employee_name: e.name }, { onConflict: "period_id,employee_id" })
      .select("id")
      .single();
    if (!slip) redirect("/payroll?error=gagal");

    await db.from("payslip_items").delete().eq("payslip_id", slip.id).eq("source", "auto");
    const items = autoItems({
      baseSalary: e.base_salary,
      overtimeRate: e.overtime_rate_per_hour,
      overtimeHours: Math.round(hours * 100) / 100,
      leaveMinutes: (leaves.data ?? []).filter((l) => l.employee_id === e.id).reduce((sum, l) => sum + l.minutes, 0),
      loans: (loans ?? []).filter((l) => l.employee_id === e.id),
    });
    await db.from("payslip_items").insert(items.map((i, n) => ({ ...i, payslip_id: slip.id, sort_order: n })));
    await recalc(db, slip.id);
  }

  redirect(`/payroll/${period.id}`);
}

async function isDraft(db: Db, payslipId: string) {
  const { data } = await db.from("payslips").select("payroll_periods(status)").eq("id", payslipId).single();
  return (data?.payroll_periods as unknown as { status: string } | null)?.status === "draft";
}

export async function addItem(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const payslipId = String(formData.get("payslip_id"));
  const name = String(formData.get("name") ?? "").trim();
  const amount = Math.round(Number(formData.get("amount")));
  const kind = formData.get("kind") === "deduction" ? "deduction" : "earning";
  if (!name) return { error: "Isi nama tambahan, mis. Bonus Performa." };
  if (!(amount > 0)) return { error: "Nominal harus lebih dari 0." };

  const db = await createClient();
  if (!(await isDraft(db, payslipId))) return { error: "Payroll ini sudah dikunci, tidak bisa diubah." };
  const { error } = await db
    .from("payslip_items")
    .insert({ payslip_id: payslipId, name, kind, amount, source: "manual", sort_order: 100 });
  if (error) return { error: "Gagal menambah. Coba lagi." };
  await recalc(db, payslipId);
  revalidatePath("/payroll", "layout");
  return { ok: `${name} ditambahkan.` };
}

export async function deleteItem(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const db = await createClient();
  const id = String(formData.get("id"));
  const { data: item } = await db.from("payslip_items").select("payslip_id, source").eq("id", id).single();
  if (!item || item.source !== "manual") return { error: "Item ini tidak bisa dihapus." };
  if (!(await isDraft(db, item.payslip_id))) return { error: "Payroll ini sudah dikunci." };
  const { error } = await db.from("payslip_items").delete().eq("id", id);
  if (error) return { error: "Gagal menghapus. Coba lagi." };
  await recalc(db, item.payslip_id);
  revalidatePath("/payroll", "layout");
  return { ok: "Item dihapus." };
}

// Locks the period first (only a draft can flip), then reduces loan balances by the installments used.
// Not one database transaction: if a loan update fails midway, correct the balance in Pinjaman.
export async function finalizePeriod(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const periodId = String(formData.get("period_id"));
  const db = await createClient();
  const { data: locked } = await db
    .from("payroll_periods")
    .update({ status: "final", finalized_at: new Date().toISOString() })
    .eq("id", periodId)
    .eq("status", "draft")
    .select("id")
    .maybeSingle();
  if (!locked) return { error: "Payroll ini sudah dikunci atau tidak ditemukan." };

  const { data: items } = await db
    .from("payslip_items")
    .select("amount, loan_id, payslips!inner(period_id)")
    .eq("payslips.period_id", periodId)
    .not("loan_id", "is", null);
  for (const i of items ?? []) {
    const { data: loan } = await db.from("loans").select("remaining").eq("id", i.loan_id!).single();
    if (loan) await db.from("loans").update({ remaining: Math.max(0, loan.remaining - i.amount) }).eq("id", i.loan_id!);
  }
  revalidatePath("/", "layout");
  return { ok: "Payroll dikunci." };
}

const SHARE_DAYS = 30;

export type ShareState = { url?: string; error?: string } | undefined;

// Creates a fresh secret link for a locked payslip (any older link stops working). Only its hash is stored.
export async function createShareLink(_prev: ShareState, formData: FormData): Promise<ShareState> {
  const payslipId = String(formData.get("payslip_id"));
  const db = await createClient();
  const { data: slip } = await db.from("payslips").select("id, payroll_periods(status)").eq("id", payslipId).single();
  if ((slip?.payroll_periods as unknown as { status: string } | null)?.status !== "final") {
    return { error: "Slip hanya bisa dibagikan setelah payroll dikunci." };
  }

  const token = randomBytes(24).toString("base64url");
  const { error } = await db
    .from("payslips")
    .update({
      share_token_hash: sha256(token),
      share_expires_at: new Date(Date.now() + SHARE_DAYS * 86_400_000).toISOString(),
    })
    .eq("id", payslipId);
  if (error) return { error: "Gagal membuat link. Coba lagi." };

  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host");
  const proto = h.get("x-forwarded-proto") ?? (host?.startsWith("localhost") ? "http" : "https");
  revalidatePath("/payroll", "layout");
  return { url: `${proto}://${host}/slip/${token}` };
}

export async function revokeShareLink(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const db = await createClient();
  const { error } = await db
    .from("payslips")
    .update({ share_token_hash: null, share_expires_at: null })
    .eq("id", String(formData.get("payslip_id")));
  if (error) return { error: "Gagal mencabut link. Coba lagi." };
  revalidatePath("/payroll", "layout");
  return { ok: "Link dicabut. Link lama tidak bisa dibuka lagi." };
}
