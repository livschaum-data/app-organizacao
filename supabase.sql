-- Execute uma vez no SQL Editor do projeto Supabase deste aplicativo.
create table if not exists public.routine_tracker_data (
  user_id uuid not null references auth.users(id) on delete cascade,
  id text not null default 'principal',
  data jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  primary key (user_id, id)
);

alter table public.routine_tracker_data enable row level security;
revoke all on table public.routine_tracker_data from anon, authenticated;

drop policy if exists "Users read own routine tracker" on public.routine_tracker_data;
create policy "Users read own routine tracker" on public.routine_tracker_data
  for select to authenticated using (auth.uid() = user_id);
drop policy if exists "Users create own routine tracker" on public.routine_tracker_data;
create policy "Users create own routine tracker" on public.routine_tracker_data
  for insert to authenticated with check (auth.uid() = user_id);
drop policy if exists "Users update own routine tracker" on public.routine_tracker_data;
create policy "Users update own routine tracker" on public.routine_tracker_data
  for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);

grant select, insert, update on public.routine_tracker_data to authenticated;
