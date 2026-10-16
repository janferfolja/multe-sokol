-- "Ni prnesu multe": penalty fines for a multa that stays unpaid.
--   level 1 after 14 days, level 2 after 28 days (so the penalty doubles).
-- penalty_for points to the overdue multa; each level can be given only once per multa.
alter table public.fines
  add column penalty_for bigint references public.fines on delete set null,
  add column penalty_level smallint check (penalty_level in (1, 2));

create unique index fines_one_penalty_per_level on public.fines (penalty_for, penalty_level)
  where penalty_for is not null;
