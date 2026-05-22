create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  created_at timestamptz not null default now()
);

create table if not exists public.favorite_tenders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  tender_code text not null,
  tender_name text not null,
  buyer_name text,
  close_date timestamptz,
  created_at timestamptz not null default now(),
  unique (user_id, tender_code)
);

create table if not exists public.tender_alerts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  query text,
  status text default 'activas',
  buyer_code text,
  min_amount numeric,
  max_amount numeric,
  enabled boolean not null default true,
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;
alter table public.favorite_tenders enable row level security;
alter table public.tender_alerts enable row level security;

create policy "Users can manage their profile"
  on public.profiles for all
  using (auth.uid() = id)
  with check (auth.uid() = id);

create policy "Users can manage their favorites"
  on public.favorite_tenders for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users can manage their alerts"
  on public.tender_alerts for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
