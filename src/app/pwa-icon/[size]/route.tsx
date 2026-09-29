import { ImageResponse } from "next/og";

// Water-drop icon on the brand blue. "maskable" keeps the drop inside the safe zone so Android can crop it.
export async function GET(_req: Request, { params }: { params: Promise<{ size: string }> }) {
  const { size } = await params;
  const maskable = size === "maskable";
  const px = maskable ? 512 : Number(size);
  if (!maskable && ![192, 512].includes(px)) return new Response("Not found", { status: 404 });

  const drop = Math.round(px * (maskable ? 0.5 : 0.62));
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#1f55d9",
          borderRadius: maskable ? 0 : px * 0.22,
        }}
      >
        <svg width={drop} height={drop} viewBox="0 0 24 24" fill="#ffffff">
          <path d="M12 2.5c3.5 4.2 6 7.1 6 10.1a6 6 0 0 1-12 0c0-3 2.5-5.9 6-10.1z" />
        </svg>
      </div>
    ),
    { width: px, height: px },
  );
}
