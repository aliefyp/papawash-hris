import { loadSlipByToken } from "@/lib/slip-data";
import { renderSlipPdf } from "@/lib/slip-pdf";
import { slipFileName } from "@/lib/slip";

export async function GET(_req: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const slip = await loadSlipByToken(token);
  if (!slip) return new Response("Link tidak berlaku.", { status: 404 });

  const pdf = await renderSlipPdf(slip);
  return new Response(new Uint8Array(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${slipFileName(slip)}"`,
      "Cache-Control": "private, no-store",
      "X-Robots-Tag": "noindex",
    },
  });
}
