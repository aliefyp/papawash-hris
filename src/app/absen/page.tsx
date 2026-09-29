import { currentDevice } from "@/lib/device";
import { adminClient } from "@/lib/supabase/admin";
import { AbsenClient } from "./absen-client";
import { PairForm } from "./pair-form";

const STALE_MS = 14 * 3600_000; // matches AUTO_CLOSE_MS in actions.ts

function freshSessions(open: { employee_id: string; clock_in_at: string }[]) {
  const now = Date.now();
  return new Map(
    open.filter((s) => now - new Date(s.clock_in_at).getTime() < STALE_MS).map((s) => [s.employee_id, s.clock_in_at]),
  );
}

export default async function AbsenPage() {
  const device = await currentDevice();
  if (!device) return <PairForm />;

  const db = adminClient();
  const [{ data: employees }, { data: open }] = await Promise.all([
    db.from("employees").select("id, name").eq("outlet_id", device.outletId).eq("active", true).order("name"),
    db.from("attendance_sessions").select("employee_id, clock_in_at").eq("outlet_id", device.outletId).is("clock_out_at", null),
  ]);

  const since = freshSessions(open ?? []);

  return (
    <AbsenClient
      outlet={device.outletName}
      initial={(employees ?? []).map((e) => ({ id: e.id, name: e.name, since: since.get(e.id) ?? null }))}
    />
  );
}
