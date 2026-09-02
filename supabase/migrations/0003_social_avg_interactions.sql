-- ============================================================
-- social_links: interações médias por post (curtidas + comentários).
-- Necessário para calcular a taxa de engajamento de verdade
-- (interações ÷ seguidores × 100). Alcance sozinho não dá engajamento.
-- ============================================================

alter table social_links
  add column if not exists avg_interactions int;
