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

create table if not exists public.licitaciones_cache (
  cache_key text primary key,
  resource text not null,
  params jsonb not null default '{}'::jsonb,
  payload jsonb not null,
  fetched_at timestamptz not null default now(),
  expires_at timestamptz not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists licitaciones_cache_resource_idx
  on public.licitaciones_cache (resource);

create index if not exists licitaciones_cache_expires_at_idx
  on public.licitaciones_cache (expires_at);

create table if not exists public.api_request_log (
  id uuid primary key default gen_random_uuid(),
  provider text not null default 'mercado_publico',
  resource text not null,
  params jsonb not null default '{}'::jsonb,
  params_hash text,
  status integer,
  cache_hit boolean not null default false,
  error_message text,
  created_at timestamptz not null default now()
);

create index if not exists api_request_log_provider_created_at_idx
  on public.api_request_log (provider, created_at);

create index if not exists api_request_log_resource_created_at_idx
  on public.api_request_log (resource, created_at);

create index if not exists api_request_log_params_hash_idx
  on public.api_request_log (params_hash);

alter table public.profiles enable row level security;
alter table public.favorite_tenders enable row level security;
alter table public.tender_alerts enable row level security;
alter table public.licitaciones_cache enable row level security;
alter table public.api_request_log enable row level security;

grant usage on schema public to anon, authenticated, service_role;

grant select, insert, update, delete on public.profiles to service_role;
grant select, insert, update, delete on public.favorite_tenders to service_role;
grant select, insert, update, delete on public.tender_alerts to service_role;
grant select, insert, update, delete on public.licitaciones_cache to service_role;
grant select, insert on public.api_request_log to service_role;

grant select, insert, update, delete on public.profiles to authenticated;
grant select, insert, update, delete on public.favorite_tenders to authenticated;
grant select, insert, update, delete on public.tender_alerts to authenticated;
grant select on public.licitaciones_cache to anon, authenticated;

drop policy if exists "Users can manage their profile" on public.profiles;

create policy "Users can manage their profile"
  on public.profiles for all
  using (auth.uid() = id)
  with check (auth.uid() = id);

drop policy if exists "Users can manage their favorites" on public.favorite_tenders;

create policy "Users can manage their favorites"
  on public.favorite_tenders for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "Users can manage their alerts" on public.tender_alerts;

create policy "Users can manage their alerts"
  on public.tender_alerts for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "Anyone can read warm public cache" on public.licitaciones_cache;

create policy "Anyone can read warm public cache"
  on public.licitaciones_cache for select
  using (expires_at > now());
