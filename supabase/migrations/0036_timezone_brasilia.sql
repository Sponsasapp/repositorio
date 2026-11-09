-- ============================================================
-- 0036 — Fuso de Brasília no banco
--
-- Problema (simulação de uso 09/11/2026): o banco rodava em UTC, então
-- `current_date` e `submitted_at::date` viravam o dia às 21h de Brasília.
-- Uma comprovação enviada às 22h no dia do prazo contava como ATRASADA no
-- rank, e uma entrega vencia 3h antes do fim do dia.
--
-- Fix: fuso padrão da sessão = America/Sao_Paulo. Afeta só "que dia é hoje"
-- e casts de timestamptz → date; os timestamps gravados (timestamptz) não
-- mudam. Os snapshots do rank continuam com `at time zone 'utc'` explícito
-- (o cron roda 06:00 UTC = 03:00 BRT, mesmo dia nos dois fusos).
--
-- Vale para conexões NOVAS. O pool do Supabase recicla sozinho em poucos
-- minutos; pra valer na hora: Settings → General → Restart project
-- (opcional).
-- ============================================================

alter database postgres set timezone to 'America/Sao_Paulo';

-- Conferir (numa aba nova do SQL Editor): show timezone;  → America/Sao_Paulo
