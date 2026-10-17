-- Osebni rekord punti: the multa for a new personal points record also stores how many points
-- were scored, so each player's record can be tracked. Null on every other multa.
alter table public.fines add column if not exists points smallint check (points >= 0);
