import ExcelJS from "exceljs";
import { loadMonthRecap, parseMonth } from "@/lib/attendance-month";
import { sheetName } from "@/lib/sheet-name";
import { createClient } from "@/lib/supabase/server";

const STATUS: Record<string, string> = { ok: "Normal", perlu_koreksi: "Perlu koreksi", dikoreksi: "Dikoreksi" };
const round2 = (n: number) => Math.round(n * 100) / 100;

function styleHeader(ws: ExcelJS.Worksheet) {
  const row = ws.getRow(1);
  row.font = { bold: true };
  row.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFEEF3FF" } };
  ws.views = [{ state: "frozen", ySplit: 1 }];
}

export async function GET(req: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return new Response("Unauthorized", { status: 401 });

  const month = parseMonth(new URL(req.url).searchParams.get("bulan") ?? undefined);
  const { rows, totals, details } = await loadMonthRecap(month);

  const wb = new ExcelJS.Workbook();
  wb.creator = "Papawash HRIS";
  wb.created = new Date();

  const rekap = wb.addWorksheet("Rekap");
  rekap.columns = [
    { header: "Karyawan", key: "name", width: 26 },
    { header: "Hari hadir", key: "days", width: 13 },
    { header: "Total jam kerja", key: "hours", width: 17, style: { numFmt: "0.00" } },
    { header: "Lembur (jam)", key: "ot", width: 14, style: { numFmt: "0.00" } },
    { header: "Perlu koreksi (hari)", key: "flagged", width: 21 },
  ];
  // One sheet per employee who has attendance this month; the Rekap row links to it.
  const used = new Set(["rekap"]);
  const sheetOf = new Map<string, string>();
  for (const r of rows) if (details.some((d) => d.employeeId === r.employeeId)) sheetOf.set(r.employeeId, sheetName(r.name, used));

  for (const r of rows) {
    const row = rekap.addRow({ name: r.name, days: r.days, hours: round2(r.workMinutes / 60), ot: r.overtimeHours, flagged: r.flagged });
    const target = sheetOf.get(r.employeeId);
    if (target) row.getCell("name").value = { text: r.name, hyperlink: `#'${target}'!A1` };
  }
  const total = rekap.addRow({
    name: "Total",
    days: totals.days,
    hours: round2(totals.workMinutes / 60),
    ot: totals.overtimeHours,
    flagged: totals.flagged,
  });
  total.font = { bold: true };
  styleHeader(rekap);

  for (const r of rows) {
    const title = sheetOf.get(r.employeeId);
    if (!title) continue;
    const ws = wb.addWorksheet(title);
    ws.columns = [
      { header: "Tanggal", key: "date", width: 13, style: { numFmt: "dd/mm/yyyy" } },
      { header: "Masuk", key: "in", width: 9 },
      { header: "Pulang", key: "out", width: 9 },
      { header: "Durasi (jam)", key: "hours", width: 14, style: { numFmt: "0.00" } },
      { header: "Lembur (jam)", key: "ot", width: 14, style: { numFmt: "0.00" } },
      { header: "Status", key: "status", width: 15 },
      { header: "Catatan koreksi", key: "note", width: 36 },
    ];
    for (const d of details.filter((x) => x.employeeId === r.employeeId)) {
      ws.addRow({
        date: new Date(`${d.date}T00:00:00Z`), // a plain date; UTC midnight keeps the calendar day intact in Excel
        in: d.clockIn,
        out: d.clockOut ?? "",
        hours: d.workMinutes == null ? null : round2(d.workMinutes / 60),
        ot: d.overtimeHours,
        status: STATUS[d.status] ?? d.status,
        note: d.note ?? "",
      });
    }
    const sum = ws.addRow({ date: "Total", hours: round2(r.workMinutes / 60), ot: r.overtimeHours });
    sum.font = { bold: true };
    styleHeader(ws);
  }

  const buffer = await wb.xlsx.writeBuffer();
  return new Response(new Uint8Array(buffer as ArrayBuffer), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="Rekap-Absensi-${month}.xlsx"`,
      "Cache-Control": "private, no-store",
    },
  });
}

export const dynamic = "force-dynamic";