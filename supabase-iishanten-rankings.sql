create table if not exists public.iishanten_ranking_submissions (
  id uuid primary key default gen_random_uuid(),
  run_id uuid not null,
  player_name text not null check (
    char_length(player_name) between 1 and 12
    and player_name !~ '[<>"''`/\\]'
    and player_name !~ '[[:cntrl:]]'
  ),
  device_id text not null check (char_length(device_id) between 4 and 64),
  difficulty_mode text not null check (
    difficulty_mode in ('basic', 'both', 'advanced')
  ),
  challenge_mode text not null check (
    challenge_mode in ('random10', 'all', 'type_filtered')
  ),
  rank text not null check (
    rank in ('F', 'E', 'D', 'C', 'B', 'A', 'S', 'SS', '神')
  ),
  score integer not null check (score >= 0),
  correct_count integer not null check (correct_count >= 0),
  answer_count integer not null check (answer_count > 0),
  elapsed_seconds numeric(10, 2) not null check (elapsed_seconds >= 0),
  average_seconds numeric(8, 2) not null check (average_seconds >= 0),
  client_version text not null,
  submitted_at timestamptz not null default now(),
  unique (device_id, run_id)
);

alter table public.iishanten_ranking_submissions enable row level security;

drop policy if exists "Anyone can read iishanten rankings"
on public.iishanten_ranking_submissions;
create policy "Anyone can read iishanten rankings"
on public.iishanten_ranking_submissions
for select to anon
using (true);

drop policy if exists "Anyone can submit iishanten results"
on public.iishanten_ranking_submissions;
create policy "Anyone can submit iishanten results"
on public.iishanten_ranking_submissions
for insert to anon
with check (
  char_length(player_name) between 1 and 12
  and char_length(device_id) between 4 and 64
  and difficulty_mode in ('basic', 'both', 'advanced')
  and challenge_mode in ('random10', 'all', 'type_filtered')
  and rank in ('F', 'E', 'D', 'C', 'B', 'A', 'S', 'SS', '神')
  and score >= 0
  and correct_count between 0 and answer_count
  and answer_count between 1 and 200
  and elapsed_seconds >= 0
  and average_seconds >= 0
  and submitted_at between now() - interval '5 minutes' and now() + interval '1 minute'
);

grant select, insert on public.iishanten_ranking_submissions to anon;

create index if not exists iishanten_rankings_submitted_idx
on public.iishanten_ranking_submissions (submitted_at desc);

create index if not exists iishanten_rankings_effort_idx
on public.iishanten_ranking_submissions (device_id, submitted_at desc);

create index if not exists iishanten_rankings_rank_idx
on public.iishanten_ranking_submissions (rank, average_seconds, submitted_at);

create or replace view public.iishanten_effort_daily
with (security_invoker = true) as
select
  device_id,
  player_name,
  (submitted_at at time zone 'Asia/Tokyo')::date as period_key,
  sum(correct_count)::bigint as correct_count,
  sum(answer_count)::bigint as answer_count,
  round(sum(elapsed_seconds) / nullif(sum(answer_count), 0), 2) as average_seconds
from public.iishanten_ranking_submissions
group by device_id, player_name, (submitted_at at time zone 'Asia/Tokyo')::date;

create or replace view public.iishanten_effort_weekly
with (security_invoker = true) as
select
  device_id,
  player_name,
  date_trunc('week', submitted_at at time zone 'Asia/Tokyo')::date as period_key,
  sum(correct_count)::bigint as correct_count,
  sum(answer_count)::bigint as answer_count,
  round(sum(elapsed_seconds) / nullif(sum(answer_count), 0), 2) as average_seconds
from public.iishanten_ranking_submissions
group by
  device_id,
  player_name,
  date_trunc('week', submitted_at at time zone 'Asia/Tokyo')::date;

create or replace view public.iishanten_effort_all
with (security_invoker = true) as
select
  device_id,
  player_name,
  'all'::text as period_key,
  sum(correct_count)::bigint as correct_count,
  sum(answer_count)::bigint as answer_count,
  round(sum(elapsed_seconds) / nullif(sum(answer_count), 0), 2) as average_seconds
from public.iishanten_ranking_submissions
group by device_id, player_name;

create or replace view public.iishanten_rank_daily
with (security_invoker = true) as
select * from (
  select
    device_id,
    player_name,
    (submitted_at at time zone 'Asia/Tokyo')::date as period_key,
    rank,
    score,
    average_seconds,
    answer_count,
    difficulty_mode,
    challenge_mode,
    submitted_at,
    row_number() over (
      partition by device_id, (submitted_at at time zone 'Asia/Tokyo')::date
      order by
        case rank
          when '神' then 9 when 'SS' then 8 when 'S' then 7
          when 'A' then 6 when 'B' then 5 when 'C' then 4
          when 'D' then 3 when 'E' then 2 else 1
        end desc,
        average_seconds asc,
        score desc,
        submitted_at asc
    ) as player_row
  from public.iishanten_ranking_submissions
) ranked
where player_row = 1;

create or replace view public.iishanten_rank_weekly
with (security_invoker = true) as
select * from (
  select
    device_id,
    player_name,
    date_trunc('week', submitted_at at time zone 'Asia/Tokyo')::date as period_key,
    rank,
    score,
    average_seconds,
    answer_count,
    difficulty_mode,
    challenge_mode,
    submitted_at,
    row_number() over (
      partition by
        device_id,
        date_trunc('week', submitted_at at time zone 'Asia/Tokyo')::date
      order by
        case rank
          when '神' then 9 when 'SS' then 8 when 'S' then 7
          when 'A' then 6 when 'B' then 5 when 'C' then 4
          when 'D' then 3 when 'E' then 2 else 1
        end desc,
        average_seconds asc,
        score desc,
        submitted_at asc
    ) as player_row
  from public.iishanten_ranking_submissions
) ranked
where player_row = 1;

create or replace view public.iishanten_rank_all
with (security_invoker = true) as
select * from (
  select
    device_id,
    player_name,
    'all'::text as period_key,
    rank,
    score,
    average_seconds,
    answer_count,
    difficulty_mode,
    challenge_mode,
    submitted_at,
    row_number() over (
      partition by device_id
      order by
        case rank
          when '神' then 9 when 'SS' then 8 when 'S' then 7
          when 'A' then 6 when 'B' then 5 when 'C' then 4
          when 'D' then 3 when 'E' then 2 else 1
        end desc,
        average_seconds asc,
        score desc,
        submitted_at asc
    ) as player_row
  from public.iishanten_ranking_submissions
) ranked
where player_row = 1;

grant select on
  public.iishanten_effort_daily,
  public.iishanten_effort_weekly,
  public.iishanten_effort_all,
  public.iishanten_rank_daily,
  public.iishanten_rank_weekly,
  public.iishanten_rank_all
to anon;
