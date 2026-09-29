import { FileX2 } from "lucide-react";
import { EmptyState } from "@/components/empty-state";

export default function SlipNotFound() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col justify-center px-4">
      <EmptyState
        icon={FileX2}
        title="Link slip tidak berlaku"
        description="Link ini sudah kedaluwarsa, dicabut, atau salah ketik. Minta pemilik usaha mengirim link yang baru."
      />
    </main>
  );
}
