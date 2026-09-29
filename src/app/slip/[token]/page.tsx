import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableFooter, TableRow } from "@/components/ui/table";
import { fmtMonth, fmtRp } from "@/lib/format";
import { loadSlipByToken } from "@/lib/slip-data";

export const metadata: Metadata = { title: "Slip gaji", robots: { index: false, follow: false } };

export default async function SlipPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const slip = await loadSlipByToken(token);
  if (!slip) notFound();

  const earn = slip.earnings.reduce((a, i) => a + i.amount, 0);
  const ded = slip.deductions.reduce((a, i) => a + i.amount, 0);

  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col gap-5 px-4 py-8">
      <div>
        <p className="text-sm text-muted-foreground">{slip.outletName}</p>
        <h1 className="text-2xl font-semibold tracking-tight">Slip gaji {fmtMonth(slip.month)}</h1>
        <p className="mt-1 text-lg">{slip.employeeName}</p>
      </div>

      <Card className="p-5">
        <p className="text-xs font-semibold tracking-wide text-muted-foreground">PENERIMAAN</p>
        <Table>
          <TableBody>
            {slip.earnings.map((i, n) => (
              <TableRow key={n}>
                <TableCell className="py-2">{i.name}</TableCell>
                <TableCell className="py-2 text-right">{fmtRp(i.amount)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
          <TableFooter>
            <TableRow className="font-semibold">
              <TableCell className="py-2">Total penerimaan</TableCell>
              <TableCell className="py-2 text-right">{fmtRp(earn)}</TableCell>
            </TableRow>
          </TableFooter>
        </Table>

        {slip.deductions.length > 0 && (
          <>
            <p className="mt-4 text-xs font-semibold tracking-wide text-muted-foreground">PENGELUARAN</p>
            <Table>
              <TableBody>
                {slip.deductions.map((i, n) => (
                  <TableRow key={n}>
                    <TableCell className="py-2">{i.name}</TableCell>
                    <TableCell className="py-2 text-right text-destructive">−{fmtRp(i.amount)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
              <TableFooter>
                <TableRow className="font-semibold">
                  <TableCell className="py-2">Total pengeluaran</TableCell>
                  <TableCell className="py-2 text-right text-destructive">−{fmtRp(ded)}</TableCell>
                </TableRow>
              </TableFooter>
            </Table>
          </>
        )}
      </Card>

      <div className="flex items-center justify-between rounded-xl bg-accent p-5">
        <span className="text-sm font-semibold">Total diterima</span>
        <span className="text-2xl font-semibold tracking-tight text-accent-foreground">{fmtRp(slip.net)}</span>
      </div>

      <Button asChild size="lg" className="h-12">
        <a href={`/slip/${token}/pdf`}>Unduh PDF</a>
      </Button>
      <p className="text-center text-xs text-muted-foreground">Link ini pribadi. Jangan dibagikan ke orang lain.</p>
    </main>
  );
}
