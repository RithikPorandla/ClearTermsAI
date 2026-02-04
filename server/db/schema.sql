create extension if not exists pgcrypto;

create table if not exists public.policy_reports (
  id uuid primary key,
  user_id text not null,
  domain text not null,
  url text not null,
  title text,
  text_hash text not null,
  policy_text text,
  analysis jsonb not null,
  created_at timestamptz default now()
);

create index if not exists policy_reports_user_id_idx on public.policy_reports (user_id);
create index if not exists policy_reports_domain_idx on public.policy_reports (domain);
