# Sponsas — Sponsorship Made Simple

Plataforma web que conecta **marcas** a **pilotos** (foco: arrancada / automobilismo BR)
para fechar e acompanhar patrocínios.

## Stack

- **Next.js 16** (App Router) · TypeScript · Tailwind v4 · shadcn/ui
- **Supabase** (Postgres + Auth + RLS) via `@supabase/ssr`
- Deploy: **Vercel** + **Supabase Cloud**

## Rodando localmente

```bash
npm install
cp .env.example .env.local   # preencha com os valores do seu projeto Supabase
npm run dev
```

`.env.local`:

| Variável | Onde achar |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase → Project Settings → API |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | idem (publishable / anon key) |
| `NEXT_PUBLIC_SITE_URL` | URL pública do site (ex: `https://sponsas.vercel.app`) |
| `SUPABASE_SERVICE_ROLE_KEY` | só para scripts locais — **não** usado em runtime |

## Banco de dados

Migrations em [`supabase/migrations/`](supabase/migrations/), aplicadas em ordem
(`0001` → `0007`) no SQL Editor do Supabase ou via CLI. Incluem o schema, RLS,
triggers de signup, cálculo do **Rank Sponsas** e espelho de plano Free/PRO.

Para regenerar os tipos após mudanças no schema:

```bash
npx supabase gen types typescript --project-id <ref> > lib/types/database.types.ts
```

## Estrutura

```
app/
  (marketing)/     páginas públicas (home, como-funciona, planos, ...)
  (auth)/          login, cadastro
  (dashboard)/     painel + perfil (com sidebar)
  pilotos/ p/[id]/ oportunidades/ propostas/ patrocinios/ entregas/ configuracoes/
lib/
  supabase/        client (browser), server (RSC/actions), proxy (sessão)
  rank.ts plan.ts format.ts ...
supabase/migrations/
```

Convenções e ordem de construção em [`AGENTS.md`](AGENTS.md).
