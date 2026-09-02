<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# Sponsas — Sponsorship Made Simple

Plataforma web que conecta **marcas** a **pilotos/atletas/criadores** buscando patrocínio.
Foco inicial: automobilismo brasileiro, especialmente **arrancada**.

## Regra de ouro do MVP

Antes de construir qualquer feature, pergunte: **"isso é necessário para gerar o
primeiro patrocínio real na plataforma?"** Se não for, não construa agora.
Menor custo possível, sem overengineering.

## Stack

- Next.js 16 (App Router) + TypeScript + Tailwind v4 + shadcn/ui (preset `radix-nova`, Lucide)
- Supabase (Postgres + Auth + Storage + RLS) — cliente via `@supabase/ssr`
- Deploy: Vercel + Supabase Cloud
- Pagamentos: manual/PIX no MVP (sem gateway)

## Convenções deste repo

- Rotas e UI em **português** (`/cadastro`, `/oportunidades`, `/patrocinios`...).
- Next 16: o arquivo de middleware é **`proxy.ts`** na raiz, função `proxy`.
- Supabase: `lib/supabase/client.ts` (browser), `server.ts` (RSC/actions), `proxy.ts` (sessão no proxy).
- Nunca criar client Supabase em escopo de módulo no servidor — sempre por request.
- Tipos do banco: `lib/types/database.types.ts` (à mão hoje; regenerar com `supabase gen types` após a migration).
- Segurança de dados = **RLS no banco**, não checagem só no front.

## Design (validado em protótipo)

Identidade "SaaS premium", não "site de carro". Tokens em `app/globals.css`:

- Fundo `#F6F5F1`, texto `#14161C`, `--navy #171F36` (nav/blocos), `--primary #FF5A1F`
  (laranja **só** em CTA e status), `--success #2F8F5B` (aprovado).
- Headlines em `Barlow Condensed` (`--font-heading`), corpo/UI em `Inter` (`--font-sans`).
- Cards com **borda esquerda colorida**, não sombra genérica. Sem eyebrow em CAPS, sem setas em botões.

## Ordem de construção

1. ✅ Setup (Next + Tailwind + shadcn + Supabase libs)
2. ✅ Migration do schema + RLS (11 tabelas, 26 policies, trigger de signup)
   - `0002_fix_handle_new_user.sql`: trigger precisou de `search_path = ''` + schema qualificado
3. ✅ Auth — cadastro/login/logout via Server Actions, escolha piloto/empresa,
   guarda de rotas no `proxy.ts`, `/auth/confirm` para o fluxo de e-mail.
   Dev: "Confirm email" desligado no Supabase (religar + SMTP na V2).
4. Perfil piloto (CRUD) → 5. Perfil empresa (CRUD)
6. Perfis públicos → 7. Busca/filtro de pilotos
8. Oportunidades → 9. Propostas → 10. `sponsorship` automático ao aceitar
11. Entregas (lista, comprovação, aprovação)
12. Dashboards → 13. Planos Free/PRO (sem gateway) → 14. Páginas de marketing → 15. Deploy

Fora do MVP: matching por IA, mídia kit público, mensagens internas, notificações por email,
pagamento automatizado, APIs de redes sociais, reputação/avaliações, i18n, app mobile.
