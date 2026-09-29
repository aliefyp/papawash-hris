"use server";

import { revalidatePath } from "next/cache";
import type { ActionState } from "@/lib/action-state";
import { createClient } from "@/lib/supabase/server";

const num = (v: FormDataEntryValue | null) => Math.max(0, Math.round(Number(v) || 0));

export async function addEmployee(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const name = String(formData.get("name") ?? "").trim();
  if (!name) return { error: "Isi nama karyawan." };
  const supabase = await createClient();
  const { error } = await supabase.from("employees").insert({
    name,
    outlet_id: String(formData.get("outlet_id")),
    base_salary: num(formData.get("base_salary")),
    overtime_rate_per_hour: num(formData.get("overtime_rate")),
  });
  if (error) return { error: "Gagal menambah karyawan. Coba lagi." };
  revalidatePath("/", "layout");
  return { ok: `${name} ditambahkan.` };
}

export async function updateEmployee(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const name = String(formData.get("name") ?? "").trim();
  if (!name) return { error: "Nama tidak boleh kosong." };
  const supabase = await createClient();
  const { error } = await supabase
    .from("employees")
    .update({
      name,
      base_salary: num(formData.get("base_salary")),
      overtime_rate_per_hour: num(formData.get("overtime_rate")),
    })
    .eq("id", String(formData.get("id")));
  if (error) return { error: "Gagal menyimpan. Coba lagi." };
  revalidatePath("/", "layout");
  return { ok: "Perubahan tersimpan." };
}

export async function setActive(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("employees")
    .update({ active: formData.get("active") === "true" })
    .eq("id", String(formData.get("id")));
  if (error) return { error: "Gagal mengubah status. Coba lagi." };
  revalidatePath("/", "layout");
  return { ok: "Status diubah." };
}
