import Link from "next/link";
import { notFound } from "next/navigation";
import { SubmitButton } from "@/components/action-form";
import { ConfirmAction } from "@/components/confirm-action";
import { StatusBadge } from "@/components/status-badge";
import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableFooter, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { fmtMonth, fmtRp } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";
import { deleteItem, finalizePeriod, generatePayroll } from "../actions";
import { AddItemForm } from "./add-item-form";
import { ShareSlip } from "./share-slip";

type Item = { id: string; name: string; kind: string; amount: number; source: string; sort_order: number; loan_id: string | null };

// A link counts as active only if one exists and has not expired. The hash itself never leaves the server.
function activeLinkUntil(hash: string | null, expires: string | null) {
  if (!hash || !expires || new Date(expires).getTime() < new Date().getTime()) return null;
  return new Date(expires).toLocaleDateString("id-ID", { timeZone: "Asia/Jakarta", day: "numeric", month: "long", year: "numeric" });
}

export default async function PeriodPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: period } = await supabase
    .from("payroll_periods")
    .select("id, month, status, outlet_id, outlets(name)")
    .eq("id", id)
    .maybeSingle();
  if (!period) notFound();

  const { data: slips } = await supabase
    .from("payslips")
    .select("id, employee_name, net_pay, share_token_hash, share_expires_at, payslip_items(id, name, kind, amount, source, sort_order, loan_id)")
    .eq("period_id", id)
    .order("employee_name");

  const draft = period.status === "draft";
  const month = period.month.slice(0, 7);
  const list = (slips ?? []).map((s) => ({
    ...s,
    items: [...(s.payslip_items as unknown as Item[])].sort((a, b) => a.sort_order - b.sort_order),
  }));
  const grandTotal = list.reduce((sum, s) => sum + s.net_pay, 0);
  const loanTotal = list.flatMap((s) => s.items).filter((i) => i.loan_id).reduce((sum, i) => sum + i.amount, 0);

  return (
    <div className="flex flex-col gap-6">
      <Link href="/payroll" className="text-sm text-muted-foreground hover:text-foreground">
        ← Semua payroll
      </Link>

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Gaji {fmtMonth(month)}</h1>
          <p className="text-muted-foreground">{(period.outlets as unknown as { name: string } | null)?.name}</p>
        </div>
        <div className="text-right">
          <p className="text-sm text-muted-foreground">Total yang dibayarkan</p>
          <p className="text-3xl font-semibold tracking-tight">{fmtRp(grandTotal)}</p>
          <p className="text-sm text-muted-foreground">{list.length} karyawan</p>
        </div>
      </div>

      {draft ? (
        <Card className="p-4">
          <p className="max-w-prose text-sm text-muted-foreground">
            <b className="text-foreground">Draft, belum dikunci.</b> Periksa tiap slip di bawah. Tambahkan bonus, reimburse, atau
            potongan bila perlu. Kalau sudah benar semua, kunci payroll.
          </p>
          <div className="flex flex-wrap items-center gap-3">
            <ConfirmAction
              action={finalizePeriod}
              fields={{ period_id: period.id }}
              trigger="Kunci payroll"
              triggerVariant="default"
              title={`Kunci gaji ${fmtMonth(month)}?`}
              confirmLabel="Ya, kunci payroll"
            >
              <p>
                Total yang dibayarkan: <b className="text-foreground">{fmtRp(grandTotal)}</b>
              </p>
              <ul className="divide-y divide-border rounded-lg border">
                {list.map((s) => (
                  <li key={s.id} className="flex justify-between px-3 py-2">
                    <span>{s.employee_name}</span>
                    <b className="text-foreground">{fmtRp(s.net_pay)}</b>
                  </li>
                ))}
              </ul>
              {loanTotal > 0 && (
                <p>
                  Sisa pinjaman berkurang total <b className="text-foreground">{fmtRp(loanTotal)}</b> sesuai cicilan bulan ini.
                </p>
              )}
              <p className="font-medium text-foreground">Setelah dikunci, slip tidak bisa diubah lagi.</p>
            </ConfirmAction>
            <form action={generatePayroll}>
              <input type="hidden" name="month" value={month} />
              <input type="hidden" name="outlet_id" value={period.outlet_id} />
              <SubmitButton variant="outline" pendingLabel="Menghitung…">
                Hitung ulang
              </SubmitButton>
            </form>
          </div>
          <p className="max-w-prose text-sm text-muted-foreground">
            <b className="font-medium text-foreground">Hitung ulang</b> memperbarui gaji pokok, lembur, dan cicilan dari data
            terbaru. Bonus dan potongan yang Anda tambahkan tetap ada.
          </p>
        </Card>
      ) : (
        <div className="rounded-xl bg-ok-soft p-4 text-sm text-ok">
          <p className="font-semibold">Payroll terkunci. Angka di bawah tidak akan berubah lagi.</p>
          <p className="mt-1">Unduh slip sebagai PDF, atau bagikan lewat link (mis. WhatsApp) supaya karyawan bisa melihatnya di HP.</p>
        </div>
      )}

      <ul className="flex flex-col gap-4">
        {list.map((s) => (
          <li key={s.id}>
            <Card className="p-5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h2 className="text-lg font-semibold">{s.employee_name}</h2>
                {!draft && (
                  <div className="flex gap-2">
                    <Button asChild variant="outline">
                      <a href={`/payroll/${period.id}/pdf/${s.id}`}>Unduh PDF</a>
                    </Button>
                    <ShareSlip
                      payslipId={s.id}
                      employeeName={s.employee_name}
                      monthLabel={fmtMonth(month)}
                      activeUntil={activeLinkUntil(s.share_token_hash, s.share_expires_at)}
                    />
                  </div>
                )}
              </div>
              <Table>
                <TableBody>
                  {s.items.map((i) => (
                    <TableRow key={i.id}>
                      <TableCell className="py-2">
                        {i.name}
                        {i.source === "manual" && <StatusBadge tone="neutral" className="ml-2">ditambah manual</StatusBadge>}
                      </TableCell>
                      <TableCell className={`py-2 text-right ${i.kind === "deduction" ? "text-destructive" : ""}`}>
                        {i.kind === "deduction" ? "−" : ""}
                        {fmtRp(i.amount)}
                      </TableCell>
                      <TableCell className="w-20 py-2 text-right">
                        {draft && i.source === "manual" && (
                          <ConfirmAction
                            action={deleteItem}
                            fields={{ id: i.id }}
                            trigger="Hapus"
                            triggerVariant="ghost"
                            triggerSize="sm"
                            title={`Hapus ${i.name}?`}
                            confirmLabel="Hapus"
                            danger
                          >
                            <p>
                              {i.name} ({fmtRp(i.amount)}) dihapus dari slip {s.employee_name}. Anda bisa menambahkannya lagi.
                            </p>
                          </ConfirmAction>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
                <TableFooter>
                  <TableRow className="text-base font-semibold">
                    <TableCell className="py-3">Total diterima</TableCell>
                    <TableCell className="py-3 text-right">{fmtRp(s.net_pay)}</TableCell>
                    <TableCell />
                  </TableRow>
                </TableFooter>
              </Table>

              {draft && <AddItemForm payslipId={s.id} employeeName={s.employee_name} />}
            </Card>
          </li>
        ))}
      </ul>
    </div>
  );
}
