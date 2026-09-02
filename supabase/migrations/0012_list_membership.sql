-- 0012 — Aba Lista: participação e Shark Tank como opções separadas.
--
-- O piloto escreve o nome da lista. Um checkbox afirma que ele faz parte dela
-- (revela a posição). Outro checkbox afirma que está no Shark Tank (revela a
-- data da próxima etapa em que está inscrito).

alter table athlete_profiles
  add column list_member boolean not null default false,
  add column list_shark_tank_date date;
