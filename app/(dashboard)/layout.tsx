import { Logo } from "@/components/logo";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { logout } from "@/app/(auth)/actions";
import { Sidebar } from "./_components/sidebar";
import { MobileNav } from "./_components/mobile-nav";
import { Button } from "@/components/ui/button";
import { NotificationBell } from "@/components/notification-bell";

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

  const { data: profile } = await supabase
    .from("profiles")
    .select("type")
    .eq("id", user.id)
    .single();
  const profileType = profile?.type ?? "athlete";

  return (
    <div className="flex min-h-screen flex-1">
      <Sidebar profileType={profileType} />
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="border-border flex items-center gap-3 border-b px-4 py-3 md:px-6">
          <MobileNav email={user.email} profileType={profileType} />
          <span className="text-lg md:hidden">
            <Logo />
          </span>
          <div className="ml-auto flex items-center gap-3">
            <span className="text-muted-foreground hidden text-sm md:block">
              {user.email}
            </span>
            <NotificationBell userId={user.id} />
            <form action={logout}>
              <Button type="submit" variant="ghost" size="sm">
                Sair
              </Button>
            </form>
          </div>
        </header>
        <main className="flex-1 px-4 py-8 md:px-10">{children}</main>
      </div>
    </div>
  );
}
