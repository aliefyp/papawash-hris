"use server";

import { revalidatePath } from "next/cache";
import type { ActionState } from "@/lib/action-state";
import { correctionNote, validateTimes } from "@/lib/correction";
import { fmtShortDate, fmtTime, wibToIso } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";

function parseLocal(v: FormDataEntryValue | null) {
  const d = new Date(wibToIso(String(v ?? "")));
  return Number.isNaN(d.getTime()) ? null : d;
}

function safeParse(v: FormDataEntryValue | null): Date | null {
  const raw = String(v ?? "").trim();
  if (!raw) return null;
  try {
    return parseLocal(raw);
  } catch {
    return null;
  }
}

// Corrects an existing session: clock-in and/or clock-out. The change is written into the note automatically.
export async function correctSession(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const id = String(formData.get("id"));
  const reason = String(formData.get("note") ?? "").trim();
  if (!reason) return { error: "Isi alasan koreksi." };

  const clockIn = safeParse(formData.get("clock_in"));
  const clockOut = safeParse(formData.get("clock_out"));
  if (!clockIn && String(formData.get("clock_in") ?? "").trim()) return { error: "Jam masuk tidak valid. Periksa tanggal dan jamnya." };
  if (!clockOut && String(formData.get("clock_out") ?? "").trim()) return { error: "Jam pulang tidak valid. Periksa tanggal dan jamnya." };
  const invalid = validateTimes({ clockIn, clockOut, now: new Date(), requireOut: formData.get("require_out") === "yes" });
  if (invalid) return { error: invalid };

  const { data: session } = await supabase
    .from("attendance_sessions")
    .select("employee_id, outlet_id, clock_in_at, clock_out_at")
    .eq("id", id)
    .single();
  if (!session) return { error: "Data absensi tidak ditemukan." };

  const before = { in: session.clock_in_at, out: session.clock_out_at };
  const after = { in: clockIn!.toISOString(), out: clockOut ? clockOut.toISOString() : null };
  // The stored value has millisecond precision; compare by instant, not by string.
  const same = (x: string | null, y: string | null) => (x === null || y === null ? x === y : new Date(x).getTime() === new Date(y).getTime());
  if (same(before.in, after.in) && same(before.out, after.out)) return { error: "Tidak ada perubahan jam." };

  let overlap = supabase
    .from("attendance_sessions")
    .select("id", { count: "exact", head: true })
    .eq("employee_id", session.employee_id)
    .neq("id", id)
    .or(`clock_out_at.is.null,clock_out_at.gt.${after.in}`);
  if (after.out) overlap = overlap.lt("clock_in_at", after.out);
  const { count: clash } = await overlap;
  if (clash) return { error: "Jam ini bertabrakan dengan absensi lain milik karyawan yang sama." };

  const fmt = (iso: string) => `${fmtShortDate(iso)} ${fmtTime(iso)}`;
  const { error } = await supabase
    .from("attendance_sessions")
    .update({
      clock_in_at: after.in,
      clock_out_at: after.out,
      status: "dikoreksi",
      corrected_by: user?.id,
      corrected_at: new Date().toISOString(),
      correction_note: correctionNote(reason, before, after, fmt),
    })
    .eq("id", id);
  if (error) return { error: "Gagal menyimpan. Coba lagi." };

  // A locked payroll month does not change; say so instead of letting the owner assume it counts.
  const month = (iso: string) => `${new Date(new Date(iso).getTime() + 7 * 3_600_000).toISOString().slice(0, 7)}-01`;
  const { count: locked } = await supabase
    .from("payroll_periods")
    .select("id", { count: "exact", head: true })
    .eq("outlet_id", session.outlet_id)
    .eq("status", "final")
    .in("month", [month(before.in), month(after.in)]);

  const day = (iso: string) => new Date(new Date(iso).getTime() + 7 * 3_600_000).toISOString().slice(0, 10);
  const moved = day(before.in) !== day(after.in) ? ` Absensi ini sekarang ada di tanggal ${fmtShortDate(after.in)}.` : "";
  revalidatePath("/", "layout");
  return {
    ok: `Koreksi tersimpan.${moved}${locked ? " Payroll bulan itu sudah dikunci, jadi perubahan tidak ikut slip." : ""}`,
  };
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
