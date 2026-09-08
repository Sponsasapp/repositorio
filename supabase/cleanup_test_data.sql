-- LIMPEZA DE DADOS DE TESTE — rodar no SQL Editor do Supabase (produção).
--
-- Apaga TODAS as 15 contas de teste. Como profiles → auth.users e todas as
-- tabelas do app têm FK "on delete cascade", basta apagar de auth.users:
-- propostas, patrocínios, entregas, mensagens, conversas, posts, rank,
-- documentos KYC, resgates/comissões de cupom — tudo cai junto.
--
-- NÃO é apagado (config, não é dado de teste):
--   coupons (códigos LANCAMENTO1, PRO3, ANOPRO, BLACKFRIDAY — influencer_id
--   vira null), rank_config, plan_config.
--
-- Confira a lista abaixo antes de rodar. Se quiser mesmo zerar sem exceção,
-- dá pra trocar tudo por:  delete from auth.users;

delete from auth.users
where id in (
  '43c48825-1569-47a2-ab6f-90602a4d1226', -- Larissa Farah (athlete, pro)
  '6527deaa-ef16-4e26-9ec4-927f9ab58bbe', -- Arthur Maccari · Curitiba/PR
  '043edbbe-c277-4f34-ac45-4521714cf54f', -- Óleo Rubra (company)
  '26bbb05a-9aea-4c7d-80f0-54c2131b57f4', -- Arthur sILVA
  'ebe82440-59c1-4c99-8278-379548527757', -- Arthur Filmeiro
  '0f10bb35-b439-4d2b-9277-3830e45f035a', -- arthur maccari
  '8e1c7d5b-f203-45c2-b0d9-6a143d63340e', -- arthur
  'c62e93a5-8e87-4eca-b925-8cda5d93e167', -- ARTHUR MACCARI
  '99edfac4-dda0-4ba4-863d-506ebb3c6458', -- arthur maccari
  '1a5c21b3-c6f2-4d6c-8041-313df9a5cd7b', -- arthur maccari (pro)
  '5bb8e197-820a-4f27-91a0-f5fd7d37e664', -- FUEL VEINZ (company, pro)
  'b7be8da8-650d-47ca-8deb-caf49e4b1ff4', -- fuel empresas (company)
  '45573b04-bbc9-4efe-9f7f-0306a7cee0de', -- arthur piloto teste
  '1ff587af-884a-4761-91b7-acb82a03fbfb', -- KYC Teste
  '4c3974b9-c5d7-4186-b779-f7a5ce086dca'  -- Autódromo Teste Sponsas (track)
);

-- Confirmação (deve voltar 0):
select count(*) as contas_restantes from auth.users;
select count(*) as profiles_restantes from public.profiles;

-- OBS: arquivos órfãos no bucket de Storage `uploads` (avatars/, car photos,
-- proofs/) NÃO são apagados por isto. Limpeza de Storage é separada, pelo
-- painel Storage do Supabase — baixa prioridade, são só arquivos soltos.
