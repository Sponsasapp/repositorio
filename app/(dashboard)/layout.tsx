import Link from "next/link";
import { HomeIcon } from "lucide-react";
import { Logo } from "@/components/logo";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { logout } from "@/app/(auth)/actions";
import { Sidebar } from "./_components/sidebar";
import { MobileNav } from "./_components/mobile-nav";
import { Button } from "@/components/ui/button";
import { NotificationBell } from "@/components/notification-bell";
import { Avatar } from "@/components/avatar";

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
    .select("type, name, photo_url")
    .eq("id", user.id)
    .single();
  const profileType = profile?.type ?? "athlete";
  const displayName = profile?.name || user.email || "Perfil";

  return (
    <div className="flex min-h-screen flex-1">
      <Sidebar profileType={profileType} />
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="border-border flex items-center gap-3 border-b px-4 py-3 md:px-6">
          <MobileNav email={user.email} profileType={profileType} />
          <span className="text-lg md:hidden">
            <Logo />
          </span>
          <div className="ml-auto flex items-center gap-1">
            <Link
              href="/"
              aria-label="Ir para a home"
              title="Home"
              className="text-muted-foreground hover:bg-accent hover:text-foreground flex size-9 items-center justify-center rounded-md"
            >
              <HomeIcon className="size-5" />
            </Link>
            <NotificationBell userId={user.id} />
          </div>
          <div className="bg-border mx-2 h-6 w-px" />
          <div className="flex items-center gap-3">
            <Link
              href="/perfil"
              aria-label={`Editar perfil de ${displayName}`}
              title="Editar perfil"
            >
              <Avatar
                src={profile?.photo_url}
                name={displayName}
                className="size-8 text-xs"
              />
            </Link>
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
