import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { logout } from "@/app/(auth)/actions";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = { title: "Painel — Sponsas" };

const TIPO_LABEL: Record<string, string> = {
  athlete: "Piloto",
  company: "Empresa",
};

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("name, type")
    .eq("id", user.id)
    .single();

  return (
    <main className="mx-auto w-full max-w-[1120px] flex-1 px-6 py-16">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-4xl">
            Olá, {profile?.name || user.email?.split("@")[0]}
          </h1>
          <p className="text-muted-foreground mt-1 text-sm">
            {profile ? (
              <>
                Conta do tipo{" "}
                <span className="text-foreground font-medium">
                  {TIPO_LABEL[profile.type] ?? profile.type}
                </span>
                . O painel completo chega nos próximos passos.
              </>
            ) : (
              "Perfil ainda não criado."
            )}
          </p>
        </div>
        <form action={logout}>
          <Button type="submit" variant="outline" size="lg">
            Sair
          </Button>
        </form>
      </div>

      <div className="border-primary bg-card mt-10 rounded-lg border border-l-3 p-5">
        <p className="text-sm font-semibold">Autenticação funcionando</p>
        <p className="text-muted-foreground mt-1 text-sm">
          Login: <span className="text-foreground">{user.email}</span> · id{" "}
          <span className="font-mono text-xs">{user.id}</span>
        </p>
        <p className="text-muted-foreground mt-1 text-sm">
          O trigger criou automaticamente seu <code>profile</code> e a{" "}
          <code>subscription</code> no plano free.
        </p>
      </div>
    </main>
  );
}
