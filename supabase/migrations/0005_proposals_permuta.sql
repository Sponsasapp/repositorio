-- ============================================================
-- Propostas: pagamento pode ser em dinheiro, permuta ou os dois.
-- Permuta = uma das partes fornece um produto/serviço; descreve o
-- item e o valor estimado. Vale nas duas direções.
-- ============================================================

create type proposal_payment_type as enum ('cash', 'trade', 'mixed');

alter table proposals
  add column payment_type proposal_payment_type not null default 'cash',
  add column trade_description text,
  add column trade_value numeric;

-- Os termos fechados ficam registrados no patrocínio.
alter table sponsorships
  add column payment_type proposal_payment_type not null default 'cash',
  add column trade_description text,
  add column trade_value numeric;
