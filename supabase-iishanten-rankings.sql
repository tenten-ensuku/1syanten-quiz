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

create table if not exists public.iishanten_daily_effort (
  device_id text not null check (char_length(device_id) between 4 and 64),
  activity_date date not null,
  player_name text not null check (
    char_length(player_name) between 1 and 12
    and player_name !~ '[<>"''`/\\]'
    and player_name !~ '[[:cntrl:]]'
  ),
  correct_count integer not null default 0 check (correct_count >= 0),
  answer_count integer not null default 0 check (answer_count >= 0),
  elapsed_seconds numeric(12, 2) not null default 0 check (elapsed_seconds >= 0),
  updated_at timestamptz not null default now(),
  primary key (device_id, activity_date)
);

alter table public.iishanten_daily_effort enable row level security;

drop policy if exists "Anyone can read iishanten daily effort"
on public.iishanten_daily_effort;
create policy "Anyone can read iishanten daily effort"
on public.iishanten_daily_effort
for select to anon
using (true);

drop policy if exists "Anyone can insert iishanten daily effort"
on public.iishanten_daily_effort;
create policy "Anyone can insert iishanten daily effort"
on public.iishanten_daily_effort
for insert to anon
with check (
  char_length(device_id) between 4 and 64
  and char_length(player_name) between 1 and 12
  and activity_date between (current_date - 1) and (current_date + 1)
  and correct_count between 0 and answer_count
  and answer_count between 0 and 10000
  and elapsed_seconds >= 0
);

drop policy if exists "Anyone can update iishanten daily effort"
on public.iishanten_daily_effort;
create policy "Anyone can update iishanten daily effort"
on public.iishanten_daily_effort
for update to anon
using (true)
with check (
  char_length(device_id) between 4 and 64
  and char_length(player_name) between 1 and 12
  and activity_date between (current_date - 1) and (current_date + 1)
  and correct_count between 0 and answer_count
  and answer_count between 0 and 10000
  and elapsed_seconds >= 0
);

grant select, insert, update on public.iishanten_daily_effort to anon;

insert into public.iishanten_daily_effort (
  device_id,
  activity_date,
  player_name,
  correct_count,
  answer_count,
  elapsed_seconds,
  updated_at
)
select
  device_id,
  (submitted_at at time zone 'Asia/Tokyo')::date,
  (array_agg(player_name order by submitted_at desc))[1],
  sum(correct_count)::integer,
  sum(answer_count)::integer,
  sum(elapsed_seconds),
  max(submitted_at)
from public.iishanten_ranking_submissions
group by device_id, (submitted_at at time zone 'Asia/Tokyo')::date
on conflict (device_id, activity_date) do nothing;

create or replace view public.iishanten_effort_daily
with (security_invoker = true) as
select
  device_id,
  player_name,
  activity_date as period_key,
  correct_count::bigint as correct_count,
  answer_count::bigint as answer_count,
  round(elapsed_seconds / nullif(answer_count, 0), 2) as average_seconds
from public.iishanten_daily_effort;

create or replace view public.iishanten_effort_weekly
with (security_invoker = true) as
select
  device_id,
  (array_agg(player_name order by activity_date desc))[1] as player_name,
  date_trunc('week', activity_date)::date as period_key,
  sum(correct_count)::bigint as correct_count,
  sum(answer_count)::bigint as answer_count,
  round(sum(elapsed_seconds) / nullif(sum(answer_count), 0), 2) as average_seconds
from public.iishanten_daily_effort
group by device_id, date_trunc('week', activity_date)::date;

create or replace view public.iishanten_effort_all
with (security_invoker = true) as
select
  device_id,
  (array_agg(player_name order by activity_date desc))[1] as player_name,
  'all'::text as period_key,
  sum(correct_count)::bigint as correct_count,
  sum(answer_count)::bigint as answer_count,
  round(sum(elapsed_seconds) / nullif(sum(answer_count), 0), 2) as average_seconds
from public.iishanten_daily_effort
group by device_id;

revoke select on public.iishanten_daily_effort from anon;
grant select (
  device_id,
  activity_date,
  player_name,
  correct_count,
  answer_count,
  elapsed_seconds,
  updated_at
) on public.iishanten_daily_effort to anon;

create table if not exists public.iishanten_effort_events (
  event_id uuid not null,
  device_id text not null check (char_length(device_id) between 4 and 64),
  activity_date date not null,
  player_name text not null check (
    char_length(player_name) between 1 and 12
    and player_name !~ '[<>"''`/\\]'
    and player_name !~ '[[:cntrl:]]'
  ),
  correct_count integer not null check (correct_count >= 0),
  answer_count integer not null check (answer_count >= 0),
  elapsed_seconds numeric(12, 2) not null check (elapsed_seconds >= 0),
  submitted_at timestamptz not null default now(),
  primary key (device_id, event_id)
);

alter table public.iishanten_effort_events enable row level security;

drop policy if exists "Anyone can read iishanten effort events"
on public.iishanten_effort_events;
create policy "Anyone can read iishanten effort events"
on public.iishanten_effort_events
for select to anon
using (true);

drop policy if exists "Anyone can submit iishanten effort events"
on public.iishanten_effort_events;
create policy "Anyone can submit iishanten effort events"
on public.iishanten_effort_events
for insert to anon
with check (
  char_length(device_id) between 4 and 64
  and char_length(player_name) between 1 and 12
  and activity_date between (current_date - 1) and (current_date + 1)
  and correct_count between 0 and answer_count
  and answer_count between 0 and 10000
  and elapsed_seconds >= 0
);

grant select, insert on public.iishanten_effort_events to anon;

revoke update on public.iishanten_daily_effort from anon;
drop policy if exists "Anyone can update own iishanten daily effort"
on public.iishanten_daily_effort;
drop policy if exists "Anyone can update iishanten daily effort"
on public.iishanten_daily_effort;

create or replace view public.iishanten_effort_daily
with (security_invoker = true) as
select
  device_id,
  (array_agg(player_name order by sort_time desc))[1] as player_name,
  period_key,
  sum(correct_count)::bigint as correct_count,
  sum(answer_count)::bigint as answer_count,
  round(sum(elapsed_seconds) / nullif(sum(answer_count), 0), 2) as average_seconds
from (
  select
    device_id,
    player_name,
    activity_date as period_key,
    correct_count,
    answer_count,
    elapsed_seconds,
    updated_at as sort_time
  from public.iishanten_daily_effort
  union all
  select
    device_id,
    player_name,
    activity_date as period_key,
    correct_count,
    answer_count,
    elapsed_seconds,
    submitted_at as sort_time
  from public.iishanten_effort_events
) effort
group by device_id, period_key;

create or replace view public.iishanten_effort_weekly
with (security_invoker = true) as
select
  device_id,
  (array_agg(player_name order by sort_time desc))[1] as player_name,
  date_trunc('week', activity_date)::date as period_key,
  sum(correct_count)::bigint as correct_count,
  sum(answer_count)::bigint as answer_count,
  round(sum(elapsed_seconds) / nullif(sum(answer_count), 0), 2) as average_seconds
from (
  select
    device_id,
    player_name,
    activity_date,
    correct_count,
    answer_count,
    elapsed_seconds,
    updated_at as sort_time
  from public.iishanten_daily_effort
  union all
  select
    device_id,
    player_name,
    activity_date,
    correct_count,
    answer_count,
    elapsed_seconds,
    submitted_at as sort_time
  from public.iishanten_effort_events
) effort
group by device_id, date_trunc('week', activity_date)::date;

create or replace view public.iishanten_effort_all
with (security_invoker = true) as
select
  device_id,
  (array_agg(player_name order by sort_time desc))[1] as player_name,
  'all'::text as period_key,
  sum(correct_count)::bigint as correct_count,
  sum(answer_count)::bigint as answer_count,
  round(sum(elapsed_seconds) / nullif(sum(answer_count), 0), 2) as average_seconds
from (
  select
    device_id,
    player_name,
    activity_date,
    correct_count,
    answer_count,
    elapsed_seconds,
    updated_at as sort_time
  from public.iishanten_daily_effort
  union all
  select
    device_id,
    player_name,
    activity_date,
    correct_count,
    answer_count,
    elapsed_seconds,
    submitted_at as sort_time
  from public.iishanten_effort_events
) effort
group by device_id;

grant select on
  public.iishanten_effort_daily,
  public.iishanten_effort_weekly,
  public.iishanten_effort_all
to anon;

alter table public.iishanten_daily_effort
add column if not exists effort_token uuid not null default gen_random_uuid();

alter table public.iishanten_daily_effort
drop constraint if exists iishanten_daily_effort_pkey;

alter table public.iishanten_daily_effort
add primary key (device_id, activity_date, effort_token);

drop policy if exists "Anyone can insert iishanten daily effort"
on public.iishanten_daily_effort;
create policy "Anyone can insert own iishanten daily effort"
on public.iishanten_daily_effort
for insert to anon
with check (
  effort_token::text = coalesce(
    current_setting('request.headers', true)::json ->> 'x-effort-token',
    ''
  )
  and char_length(device_id) between 4 and 64
  and char_length(player_name) between 1 and 12
  and activity_date between (current_date - 1) and (current_date + 1)
  and correct_count between 0 and answer_count
  and answer_count between 0 and 10000
  and elapsed_seconds >= 0
);

drop policy if exists "Anyone can update iishanten daily effort"
on public.iishanten_daily_effort;
create policy "Anyone can update own iishanten daily effort"
on public.iishanten_daily_effort
for update to anon
using (
  effort_token::text = coalesce(
    current_setting('request.headers', true)::json ->> 'x-effort-token',
    ''
  )
)
with check (
  effort_token::text = coalesce(
    current_setting('request.headers', true)::json ->> 'x-effort-token',
    ''
  )
  and char_length(device_id) between 4 and 64
  and char_length(player_name) between 1 and 12
  and activity_date between (current_date - 1) and (current_date + 1)
  and correct_count between 0 and answer_count
  and answer_count between 0 and 10000
  and elapsed_seconds >= 0
);

create or replace view public.iishanten_effort_daily
with (security_invoker = true) as
select
  device_id,
  (array_agg(player_name order by updated_at desc))[1] as player_name,
  activity_date as period_key,
  sum(correct_count)::bigint as correct_count,
  sum(answer_count)::bigint as answer_count,
  round(sum(elapsed_seconds) / nullif(sum(answer_count), 0), 2) as average_seconds
from public.iishanten_daily_effort
group by device_id, activity_date;

create or replace view public.iishanten_effort_weekly
with (security_invoker = true) as
select
  device_id,
  (array_agg(player_name order by updated_at desc))[1] as player_name,
  date_trunc('week', activity_date)::date as period_key,
  sum(correct_count)::bigint as correct_count,
  sum(answer_count)::bigint as answer_count,
  round(sum(elapsed_seconds) / nullif(sum(answer_count), 0), 2) as average_seconds
from public.iishanten_daily_effort
group by device_id, date_trunc('week', activity_date)::date;

create or replace view public.iishanten_effort_all
with (security_invoker = true) as
select
  device_id,
  (array_agg(player_name order by updated_at desc))[1] as player_name,
  'all'::text as period_key,
  sum(correct_count)::bigint as correct_count,
  sum(answer_count)::bigint as answer_count,
  round(sum(elapsed_seconds) / nullif(sum(answer_count), 0), 2) as average_seconds
from public.iishanten_daily_effort
group by device_id;
