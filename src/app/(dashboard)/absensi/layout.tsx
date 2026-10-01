import { AbsensiTabs } from "@/components/absensi-tabs";

export default function AbsensiLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-6">
      <AbsensiTabs />
      {children}
    </div>
  );
}
