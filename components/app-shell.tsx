import { Logo } from "@/components/logo";
import { createClient } from "@/lib/supabase/server";
import { Sidebar } from "@/app/(dashboard)/_components/sidebar";
import { MobileNav } from "@/app/(dashboard)/_components/mobile-nav";
import { SiteHeader } from "@/components/marketing/site-header";
import { logout } from "@/app/(auth)/actions";
import { Button } from "@/components/ui/button";

/**
 * Casca das páginas que são públicas mas fazem parte do app (pilotos,
 * oportunidades). Logado → barra lateral + menu mobile. Anônimo → header
 * de marketing. Assim a navegação nunca some pra quem está logado.
 */
export async function AppShell({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return (
      <div className="flex min-h-full flex-1 flex-col">
        <SiteHeader isLoggedIn={false} />
        <main className="flex-1 px-4 py-8 md:px-10 md:py-10">{children}</main>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-1">
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="border-border flex items-center gap-3 border-b px-4 py-3 md:px-6">
          <MobileNav email={user.email} />
          <span className="text-lg md:hidden">
            <Logo />
          </span>
          <span className="text-muted-foreground ml-auto hidden text-sm md:block">
            {user.email}
          </span>
          <form action={logout} className="ml-auto md:ml-4">
            <Button type="submit" variant="ghost" size="sm">
              Sair
            </Button>
          </form>
        </header>
        <main className="flex-1 px-4 py-8 md:px-10">{children}</main>
      </div>
    </div>
  );
}
