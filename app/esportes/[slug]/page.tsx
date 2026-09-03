import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { SPORTS } from "@/lib/sports";
import { AppShell } from "@/components/app-shell";
import { Button } from "@/components/ui/button";

export function generateStaticParams() {
  return SPORTS.map((s) => ({ slug: s.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const sport = SPORTS.find((s) => s.slug === slug);
  return {
    title: sport ? `${sport.label} — Sponsas` : "Esporte — Sponsas",
    robots: { index: false },
  };
}

export default async function EsportePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const sport = SPORTS.find((s) => s.slug === slug);
  if (!sport) notFound();
  if (sport.available) redirect("/pilotos");

  return (
    <AppShell>
      <div className="bg-navy text-navy-foreground flex min-h-[70vh] flex-col items-center justify-center rounded-xl px-6 py-24 text-center">
        <p className="text-primary text-xs font-semibold tracking-wide uppercase">
          Sponsas
        </p>
        <h1 className="mt-3 text-5xl md:text-6xl">{sport.label} está chegando</h1>
        <p className="mt-5 max-w-md text-lg text-white/70">
          Estamos montando as categorias, o Rank Sponsas e as ferramentas de{" "}
          {sport.label.toLowerCase()} na plataforma. Crie sua conta e a gente te
          avisa assim que abrir.
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Button asChild size="lg">
            <Link href="/cadastro">Criar conta</Link>
          </Button>
          <Button
            asChild
            size="lg"
            variant="ghost"
            className="text-white hover:bg-white/10 hover:text-white"
          >
            <Link href="/pilotos">Ver o que já tem</Link>
          </Button>
        </div>
      </div>
    </AppShell>
  );
}
