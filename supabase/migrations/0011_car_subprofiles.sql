-- 0011 — Carro como sub-perfil.
--
-- Patrocínio é por carro, não por piloto. Cada carro (athlete_cars) vira um
-- sub-perfil com suas próprias conquistas. As conquistas de todos os carros são
-- somadas no perfil público do piloto.
--
-- car_id nulo em athlete_achievements = conquista geral do piloto, sem carro
-- atual (ex: carro já vendido, kart, categoria antiga).
--
-- Lista: o "número da lista" (0010) deixa de existir; a 2ª informação da aba
-- Lista passa a ser a posição atual, já coberta por list_position.

alter table athlete_achievements
  add column car_id uuid references athlete_cars(id) on delete cascade;
create index if not exists idx_athlete_achievements_car
  on athlete_achievements(car_id);

alter table athlete_profiles drop column list_number;
