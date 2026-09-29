"use server";

import { randomBytes } from "node:crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { adminClient } from "@/lib/supabase/admin";
import { currentDevice, DEVICE_COOKIE, sha256 } from "@/lib/device";

const AUTO_CLOSE_MS = 14 * 3600_000; // an open session older than this is closed as perlu_koreksi
// Guards against an accidental double tap (masuk then pulang). Seconds; set ATTENDANCE_MIN_STAY_SECONDS=0 to test.
const MIN_STAY_MS = Number(process.env.ATTENDANCE_MIN_STAY_SECONDS ?? 60) * 1000;

export async function pairDevice(_prev: { error?: string } | undefined, formData: FormData) {
  const code = String(formData.get("code") ?? "").toUpperCase().replace(/[^A-Z0-9]/g, "");
  const token = randomBytes(32).toString("hex");

  // Single atomic update: only a pending device with an unexpired code matches, and the code dies with it.
  const { data } = await adminClient()
    .from("devices")
    .update({
      status: "active",
      token_hash: sha256(token),
      pairing_code_hash: null,
      pairing_expires_at: null,
    })
    .eq("pairing_code_hash", sha256(code))
    .eq("status", "pending")
    .gt("pairing_expires_at", new Date().toISOString())
    .select("id")
    .maybeSingle();
  if (!data) return { error: "Kode salah atau sudah kedaluwarsa. Minta owner membuat kode baru." };

  (await cookies()).set(DEVICE_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 365 * 10,
  });
  redirect("/absen");
}

export type AttendanceResult = { ok: true; kind: "masuk" | "pulang"; at: string } | { ok: false; error: string };

export async function submitAttendance(employeeId: string, formData: FormData): Promise<AttendanceResult> {
  const device = await currentDevice();
  if (!device) return { ok: false, error: "HP ini belum terdaftar atau aksesnya dicabut. Muat ulang halaman." };

  const photo = formData.get("photo");
  if (!(photo instanceof File) || photo.size === 0 || photo.size > 3_000_000) {
    return { ok: false, error: "Foto tidak valid. Ambil foto ulang." };
  }

  const db = adminClient();
  const { data: emp } = await db
    .from("employees")
    .select("id")
    .eq("id", employeeId)
    .eq("outlet_id", device.outletId)
    .eq("active", true)
    .maybeSingle();
  if (!emp) return { ok: false, error: "Karyawan tidak ditemukan di cabang ini." };

  const now = new Date();
  let { data: open } = await db
    .from("attendance_sessions")
    .select("id, clock_in_at")
    .eq("employee_id", employeeId)
    .is("clock_out_at", null)
    .maybeSingle();

  // Forgot to clock out: close the stale session at the limit, flagged for the owner to correct.
  if (open && now.getTime() - new Date(open.clock_in_at).getTime() > AUTO_CLOSE_MS) {
    await db
      .from("attendance_sessions")
      .update({
        clock_out_at: new Date(new Date(open.clock_in_at).getTime() + AUTO_CLOSE_MS).toISOString(),
        status: "perlu_koreksi",
      })
      .eq("id", open.id);
    open = null;
  }

  const kind = open ? "pulang" : "masuk";
  if (open && now.getTime() - new Date(open.clock_in_at).getTime() < MIN_STAY_MS) {
    return { ok: false, error: "Baru saja absen masuk. Tunggu sebentar sebelum absen pulang." };
  }

  const path = `${device.outletId}/${employeeId}/${now.getTime()}-${kind}.jpg`;
  const { error: uploadError } = await db.storage
    .from("attendance-photos")
    .upload(path, photo, { contentType: "image/jpeg" });
  if (uploadError) return { ok: false, error: "Foto gagal diunggah. Coba lagi." };

  const { error } = open
    ? await db
        .from("attendance_sessions")
        .update({ clock_out_at: now.toISOString(), clock_out_photo: path })
        .eq("id", open.id)
        .is("clock_out_at", null)
    : await db.from("attendance_sessions").insert({
        employee_id: employeeId,
        outlet_id: device.outletId,
        device_id: device.id,
        clock_in_at: now.toISOString(),
        clock_in_photo: path,
      });
  if (error) return { ok: false, error: "Absen gagal disimpan. Coba lagi." };

  return { ok: true, kind, at: now.toISOString() };
}
