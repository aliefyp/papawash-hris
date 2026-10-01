"use server";

import { revalidatePath } from "next/cache";
import type { ActionState } from "@/lib/action-state";
import { FULL_DAY_MINUTES } from "@/lib/leave";
import { createClient } from "@/lib/supabase/server";

export async function addLeave(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const date = String(formData.get("date") ?? "");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return { error: "Pilih tanggal izin." };

  const allDay = formData.get("all_day") === "on";
  const minutes = allDay
    ? FULL_DAY_MINUTES
    : Math.round(Number(formData.get("hours") || 0)) * 60 + Math.round(Number(formData.get("minutes") || 0));
  if (!(minutes > 0)) return { error: "Isi lama izin, minimal 15 menit." };
  if (minutes > 24 * 60) return { error: "Lama izin tidak boleh lebih dari 24 jam." };

  const supabase = await createClient();
  const employeeId = String(formData.get("employee_id"));
  const { data: emp } = await supabase.from("employees").select("outlet_id").eq("id", employeeId).single();
  if (!emp) return { error: "Karyawan tidak ditemukan." };

  const { error } = await supabase.from("leaves").insert({
    employee_id: employeeId,
    outlet_id: emp.outlet_id,
    leave_date: date,
    minutes,
    deducted: formData.get("deducted") !== "no",
    note: String(formData.get("note") ?? "").trim() || null,
  });
  if (error) {
    return {
      error: error.code === "PGRST205" || error.code === "42P01"
        ? "Tabel izin belum dibuat. Jalankan migration 20260929020000_leaves.sql di Supabase SQL Editor."
        : "Gagal menyimpan. Coba lagi.",
    };
  }

  // A locked month cannot change; say so instead of letting the owner assume it counts.
  const { data: locked } = await supabase
    .from("payroll_periods")
    .select("id")
    .eq("outlet_id", emp.outlet_id)
    .eq("month", `${date.slice(0, 7)}-01`)
    .eq("status", "final")
    .maybeSingle();

  revalidatePath("/", "layout");
  return {
    ok: locked
      ? "Izin dicatat, tapi payroll bulan itu sudah dikunci, jadi potongannya tidak ikut."
      : "Izin dicatat. Klik Hitung ulang di payroll bulan itu agar potongannya masuk.",
  };
}

export async function deleteLeave(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const supabase = await createClient();
  const { error } = await supabase.from("leaves").delete().eq("id", String(formData.get("id")));
  if (error) return { error: "Gagal menghapus. Coba lagi." };
  revalidatePath("/", "layout");
  return { ok: "Izin dihapus." };
}
