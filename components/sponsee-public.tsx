import Link from "next/link";
import { Avatar } from "@/components/avatar";
import { Button } from "@/components/ui/button";
import { iniciarConversa } from "@/app/(dashboard)/mensagens/actions";
import { PARTICIPANT } from "@/lib/participant-types";
import type { Profile, ProfileType, SocialLink } from "@/lib/types/database.types";

const PLATFORM_LABEL: Record<string, string> = {
  instagram: "Instagram",
  tiktok: "TikTok",
  youtube: "YouTube",
  facebook: "Facebook",
};

function fmt(n: number | null | undefined) {
  if (n == null) return "—";
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${Math.round(n / 1_000)} mil`;
  return String(n);
}

/**
 * Casca do perfil público de pista / evento / mídia. Hero + coluna de
 * detalhes (children) + CTA de patrocínio. Espelha /e/[id] e /p/[id].
 */
export function SponseePublic({
  profile,
  type,
  subtitle,
  socials,
  viewerId,
  viewerType,
  canMessage,
  messageHint,
  children,
}: {
  profile: Profile;
  type: ProfileType;
  subtitle: string;
  socials: SocialLink[];
  viewerId: string | null;
  viewerType: ProfileType | null;
  canMessage: boolean;
  messageHint: string | null;
  children: React.ReactNode;
}) {
  const isOwner = viewerId === profile.id;
  const isCompany = viewerType === "company";
  const meta = PARTICIPANT[type];

  return (
    <main className="flex-1">
      <div className="bg-navy text-navy-foreground">
        <div className="mx-auto max-w-5xl px-6 pt-14 pb-20">
          <Link href="/" className="text-sm text-white/50 hover:text-white">
            ← Sponsas
          </Link>
          <div className="mt-8 flex items-end gap-5">
            <Avatar
              src={profile.photo_url}
              name={profile.name}
              tone="primary"
              rounded="xl"
              className="size-24 text-4xl"
            />
            <div>
              <div className="flex flex-wrap items-center gap-3">
                <h1 className="text-5xl">{profile.name}</h1>
                <span className="rounded-full bg-white/10 px-3 py-1 text-xs font-semibold">
                  {meta.label}
                </span>
              </div>
              {subtitle && (
                <p className="mt-1 text-sm text-white/70">{subtitle}</p>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="mx-auto -mt-12 max-w-5xl px-6 pb-20">
        <div className="grid gap-6 md:grid-cols-[1fr_320px]">
          <div className="flex flex-col gap-6">
            {children}

            {profile.bio && (
              <Panel title="Sobre">
                <p className="text-sm whitespace-pre-wrap">{profile.bio}</p>
              </Panel>
            )}

            {socials.length > 0 && (
              <Panel title="Redes sociais">
                <ul className="flex flex-col gap-2 text-sm">
                  {socials.map((l) => (
                    <li key={l.id} className="flex justify-between gap-3">
                      <span>
                        {PLATFORM_LABEL[l.platform] ?? l.platform}
                        {l.url && (
                          <a
                            href={l.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-muted-foreground ml-2 underline"
                          >
                            abrir
                          </a>
                        )}
                      </span>
                      <span className="text-muted-foreground">
                        {fmt(l.followers)} seg ·{" "}
                        {l.engagement_rate != null
                          ? `${l.engagement_rate}%`
                          : "—"}{" "}
                        eng
                      </span>
                    </li>
                  ))}
                </ul>
              </Panel>
            )}
          </div>

          <div className="flex flex-col gap-5">
            <div className="border-primary bg-card rounded-xl border border-l-3 p-6">
              <h3 className="text-lg font-semibold">
                {isOwner ? "Este é o seu perfil público" : "Interessado em patrocinar?"}
              </h3>
              <p className="text-muted-foreground mt-2 text-sm">
                {isOwner
                  ? "É assim que as marcas veem você. Mantenha os dados atualizados."
                  : `Envie uma proposta direta pra este ${meta.label.toLowerCase()}.`}
              </p>
              <Button
                asChild
                size="lg"
                variant={isOwner ? "outline" : "default"}
                className="mt-4 w-full"
              >
                {isOwner ? (
                  <Link href="/perfil">Editar perfil</Link>
                ) : isCompany ? (
                  <Link href={`/propostas/nova?para=${profile.id}`}>
                    Enviar proposta
                  </Link>
                ) : viewerId ? (
                  <Link href="/pilotos">Ver pilotos</Link>
                ) : (
                  <Link href={`/login?next=/${meta.urlSingular}/${profile.id}`}>
                    Entrar para enviar proposta
                  </Link>
                )}
              </Button>
              {!isOwner && viewerId && canMessage && (
                <form action={iniciarConversa} className="mt-2">
                  <input type="hidden" name="para" value={profile.id} />
                  <Button
                    type="submit"
                    size="lg"
                    variant="outline"
                    className="w-full"
                  >
                    Mandar mensagem
                  </Button>
                </form>
              )}
              {!isOwner && viewerId && !canMessage && messageHint && (
                <p className="text-muted-foreground mt-3 text-center text-xs">
                  {messageHint}
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}

export function Panel({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="border-border bg-card rounded-xl border p-6">
      <h2 className="text-muted-foreground text-xs font-semibold tracking-wide uppercase">
        {title}
      </h2>
      <div className="mt-3">{children}</div>
    </section>
  );
}
