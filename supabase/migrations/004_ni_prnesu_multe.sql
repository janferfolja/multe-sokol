-- Unpaid multe:
--   after 14 days → a "Ni prnesu multe" penalty fine; penalty_for points to the overdue multa
--                   (only one penalty per multa).
--   after 28 days → the multa itself doubles: doubled_at is set and it counts twice
--                   (3€ → 6€, KASA → 2 KASE, MERENDA → 2 MERENDE).
-- Safe to run even if an earlier version of this file was already run.

alter table public.fines add column if not exists penalty_for bigint references public.fines on delete set null;
alter table public.fines add column if not exists doubled_at timestamptz;

-- cleanup from the earlier version of this file
drop index if exists public.fines_one_penalty_per_level;
alter table public.fines drop column if exists penalty_level;

create unique index if not exists fines_one_penalty_per_fine on public.fines (penalty_for)
  where penalty_for is not null;
