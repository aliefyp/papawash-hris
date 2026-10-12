import Image from "next/image";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { DashboardNav } from "@/components/dashboard-nav";
import { Button } from "@/components/ui/button";
import { logout } from "../login/actions";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // Signed in but not an owner: show nothing rather than an empty (RLS-filtered) dashboard.
  const { data: admin } = await supabase.from("admins").select("user_id").maybeSingle();
  if (!admin) {
    return (
      <main className="mx-auto max-w-md p-6">
        <p>Akun ini tidak punya akses owner.</p>
        <form action={logout} className="mt-4">
          <Button variant="outline">Keluar</Button>
        </form>
      </main>
    );
  }

  return (
    <div className="min-h-dvh md:grid md:grid-cols-[15rem_1fr]">
      <aside className="flex flex-col gap-3 border-b border-border bg-secondary px-4 py-3 md:sticky md:top-0 md:h-dvh md:gap-8 md:border-b-0 md:border-r md:py-6">
        <div className="flex items-center justify-between">
          <Image src="/logo.png" alt="Papawash" width={720} height={390} priority className="ml-3 h-auto w-24 md:w-28" />
          <form action={logout} className="md:hidden">
            <Button variant="ghost" size="sm">Keluar</Button>
          </form>
        </div>
        <DashboardNav />
        <form action={logout} className="mt-auto hidden md:block">
          <Button variant="ghost" className="w-full justify-start text-muted-foreground">Keluar</Button>
        </form>
      </aside>
      <div className="min-w-0 px-4 py-8 md:px-14 md:py-14">
        <div className="mx-auto max-w-4xl">{children}</div>
      </div>
    </div>
  );
}
