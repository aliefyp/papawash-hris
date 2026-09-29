"use server";

import { revalidatePath } from "next/cache";
import type { ActionState } from "@/lib/action-state";
import { createClient } from "@/lib/supabase/server";

export async function addLoan(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const total = Math.round(Number(formData.get("total")));
  const installment = Math.round(Number(formData.get("installment")));
  if (!(total > 0)) return { error: "Total pinjaman harus lebih dari 0." };
  if (!(installment > 0)) return { error: "Cicilan per bulan harus lebih dari 0." };
  if (installment > total) return { error: "Cicilan per bulan tidak boleh lebih besar dari total pinjaman." };

  const supabase = await createClient();
  const { error } = await supabase.from("loans").insert({
    employee_id: String(formData.get("employee_id")),
    total_amount: total,
    monthly_installment: installment,
    remaining: total,
    note: String(formData.get("note") ?? "").trim() || null,
  });
  if (error) return { error: "Gagal mencatat pinjaman. Coba lagi." };
  revalidatePath("/", "layout");
  return { ok: "Pinjaman dicatat. Cicilannya otomatis masuk payroll bulan berikutnya." };
}
