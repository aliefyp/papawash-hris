import { loadSlipForOwner } from "@/lib/slip-data";
import { renderSlipPdf } from "@/lib/slip-pdf";
import { slipFileName } from "@/lib/slip";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string; slipId: string }> }) {
  const { id, slipId } = await params;
  const slip = await loadSlipForOwner(id, slipId);
  if (!slip) return new Response("Slip tidak ditemukan atau payroll belum dikunci.", { status: 404 });

  const pdf = await renderSlipPdf(slip);
  return new Response(new Uint8Array(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${slipFileName(slip)}"`,
      "Cache-Control": "private, no-store",
    },
  });
}
