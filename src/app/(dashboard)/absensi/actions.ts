"use server";

import { revalidatePath } from "next/cache";
import type { ActionState } from "@/lib/action-state";
import { wibToIso } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";

function parseLocal(v: FormDataEntryValue | null) {
  const d = new Date(wibToIso(String(v ?? "")));
  return Number.isNaN(d.getTime()) ? null : d;
}

export async function correctClockOut(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let clockOut: Date | null = null;
  try {
    clockOut = parseLocal(formData.get("clock_out"));
  } catch {
    clockOut = null;
  }
  if (!clockOut) return { error: "Isi jam pulang dulu." };

  const id = String(formData.get("id"));
  const { data: session } = await supabase.from("attendance_sessions").select("clock_in_at").eq("id", id).single();
  if (!session) return { error: "Data absensi tidak ditemukan." };
  if (clockOut <= new Date(session.clock_in_at)) return { error: "Jam pulang harus setelah jam masuk." };

  const { error } = await supabase
    .from("attendance_sessions")
    .update({
      clock_out_at: clockOut.toISOString(),
      status: "dikoreksi",
      corrected_by: user?.id,
      corrected_at: new Date().toISOString(),
      correction_note: String(formData.get("note") ?? "").trim() || null,
    })
    .eq("id", id);
  if (error) return { error: "Gagal menyimpan. Coba lagi." };

  revalidatePath("/", "layout");
  return { ok: "Koreksi tersimpan." };
}

export async function addManualSession(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let clockIn: Date | null = null;
  let clockOut: Date | null = null;
  try {
    clockIn = parseLocal(formData.get("clock_in"));
    clockOut = parseLocal(formData.get("clock_out"));
  } catch {
    // falls through to the message below
  }
  if (!clockIn || !clockOut) return { error: "Isi jam masuk dan jam pulang." };
  if (clockOut <= clockIn) return { error: "Jam pulang harus setelah jam masuk." };

  const employeeId = String(formData.get("employee_id"));
  const { data: emp } = await supabase.from("employees").select("outlet_id").eq("id", employeeId).single();
  if (!emp) return { error: "Karyawan tidak ditemukan." };

  const { count: overlap } = await supabase
    .from("attendance_sessions")
    .select("id", { count: "exact", head: true })
    .eq("employee_id", employeeId)
    .lt("clock_in_at", clockOut.toISOString())
    .or(`clock_out_at.is.null,clock_out_at.gt.${clockIn.toISOString()}`);
  if (overlap) return { error: "Karyawan ini sudah punya absensi di jam tersebut." };

  const { error } = await supabase.from("attendance_sessions").insert({
    employee_id: employeeId,
    outlet_id: emp.outlet_id,
    clock_in_at: clockIn.toISOString(),
    clock_out_at: clockOut.toISOString(),
    status: "dikoreksi",
    corrected_by: user?.id,
    corrected_at: new Date().toISOString(),
    correction_note: `Manual: ${String(formData.get("note") ?? "").trim()}`,
  });
  if (error) return { error: "Gagal menyimpan. Coba lagi." };

  revalidatePath("/", "layout");
  return { ok: "Absensi manual tersimpan." };
}
