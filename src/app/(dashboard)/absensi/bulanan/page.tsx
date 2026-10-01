import { Users } from "lucide-react";
import Link from "next/link";
import { EmptyState } from "@/components/empty-state";
import { MonthPicker } from "@/components/month-picker";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableFooter, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { loadMonthRecap, parseMonth, shiftMonth } from "@/lib/attendance-month";
import { fmtHours, fmtMonth, fmtShortDate } from "@/lib/format";
import { fmtLeave } from "@/lib/leave";

export default async function BulananPage({ searchParams }: { searchParams: Promise<{ bulan?: string }> }) {
  const month = parseMonth((await searchParams).bulan);
  const { rows, totals, details } = await loadMonthRecap(month);
  const flaggedDays = details.filter((d) => d.status === "perlu_koreksi");
  const dur = (min: number) => fmtLeave(min) || "0 jam";

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Rekap {fmtMonth(month)}</h1>
          <p className="text-muted-foreground">Ringkasan absensi tiap karyawan dalam sebulan.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button asChild variant="outline" size="icon" aria-label="Bulan sebelumnya">
            <Link href={`/absensi/bulanan?bulan=${shiftMonth(month, -1)}`}>←</Link>
          </Button>
          <MonthPicker value={month} path="/absensi/bulanan" />
          <Button asChild variant="outline" size="icon" aria-label="Bulan berikutnya">
            <Link href={`/absensi/bulanan?bulan=${shiftMonth(month, 1)}`}>→</Link>
          </Button>
          <Button asChild>
            <a href={`/absensi/bulanan/export?bulan=${month}`}>Unduh Excel</a>
          </Button>
        </div>
      </div>

      {flaggedDays.length > 0 && (
        <div className="rounded-xl bg-warn-soft p-4 text-sm text-warn">
          <p className="font-semibold">{flaggedDays.length} hari perlu dikoreksi (lupa absen pulang)</p>
          <p className="mt-1">Hari ini tidak dihitung di jam kerja dan lembur sampai jam pulangnya diisi.</p>
          <ul className="mt-2 flex flex-wrap gap-2">
            {flaggedDays.map((d, i) => (
              <li key={i}>
                <Button asChild variant="secondary" size="sm" className="rounded-full bg-card">
                  <Link href={`/absensi?tanggal=${d.date}`}>
                    {d.employeeName} · {fmtShortDate(`${d.date}T12:00:00+07:00`)}
                  </Link>
                </Button>
              </li>
            ))}
          </ul>
        </div>
      )}

      {!rows.length ? (
        <EmptyState
          icon={Users}
          title="Belum ada karyawan"
          description="Rekap muncul setelah ada karyawan yang absen. Tambahkan karyawan di menu Karyawan."
        />
      ) : (
        <>
          <Card className="py-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="px-4">Karyawan</TableHead>
                  <TableHead className="text-right">Hari hadir</TableHead>
                  <TableHead className="text-right">Total jam kerja</TableHead>
                  <TableHead className="text-right">Lembur</TableHead>
                  <TableHead className="pr-4 text-right">Perlu koreksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((r) => (
                  <TableRow key={r.employeeId}>
                    <TableCell className="px-4 py-3 font-medium">{r.name}</TableCell>
                    <TableCell className="text-right">{r.days} hari</TableCell>
                    <TableCell className="text-right">{dur(r.workMinutes)}</TableCell>
                    <TableCell className="text-right">{r.overtimeHours ? `${fmtHours(r.overtimeHours)} jam` : "-"}</TableCell>
                    <TableCell className="pr-4 text-right">
                      {r.flagged ? <span className="font-medium text-warn">{r.flagged} hari</span> : "-"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
              <TableFooter>
                <TableRow className="font-semibold">
                  <TableCell className="px-4 py-3">Total</TableCell>
                  <TableCell className="text-right">{totals.days} hari</TableCell>
                  <TableCell className="text-right">{dur(totals.workMinutes)}</TableCell>
                  <TableCell className="text-right">{totals.overtimeHours ? `${fmtHours(totals.overtimeHours)} jam` : "-"}</TableCell>
                  <TableCell className="pr-4 text-right">{totals.flagged ? `${totals.flagged} hari` : "-"}</TableCell>
                </TableRow>
              </TableFooter>
            </Table>
          </Card>
          {totals.days === 0 && <p className="text-sm text-muted-foreground">Belum ada absensi di bulan ini.</p>}
          <p className="text-xs text-muted-foreground">
            Lembur memakai aturan yang sama dengan payroll (lewat 9 jam per hari, mulai 30 menit). Rincian harian ada di file Excel
            (satu sheet per karyawan).
          </p>
        </>
      )}
    </div>
  );
}
