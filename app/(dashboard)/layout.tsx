import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { logout } from "@/app/(auth)/actions";
import { Sidebar } from "./_components/sidebar";
import { Button } from "@/components/ui/button";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  return (
    <div className="flex min-h-screen flex-1">
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="border-border flex items-center justify-between border-b px-6 py-3">
          <span className="text-muted-foreground text-sm md:hidden">
            Spon<span className="text-primary font-bold">sas</span>
          </span>
          <span className="text-muted-foreground ml-auto text-sm">
            {user.email}
          </span>
          <form action={logout} className="ml-4">
            <Button type="submit" variant="ghost" size="sm">
              Sair
            </Button>
          </form>
        </header>
        <main className="flex-1 px-6 py-8 md:px-10">{children}</main>
      </div>
    </div>
  );
}
