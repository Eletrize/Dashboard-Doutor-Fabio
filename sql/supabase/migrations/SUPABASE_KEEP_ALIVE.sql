create table if not exists public.keep_alive (
  id int primary key,
  created_at timestamptz not null default now()
);

insert into public.keep_alive (id)
values (1)
on conflict (id) do nothing;

alter table public.keep_alive enable row level security;

drop policy if exists "anon can read keep alive" on public.keep_alive;
create policy "anon can read keep alive"
on public.keep_alive
for select
to anon
using (true);
