begin;
create table public.wedding_messages (
  id uuid primary key default gen_random_uuid(),
  name text not null check(char_length(name) between 1 and 30),
  recipient text not null check(recipient in ('couple','groom','bride')),
  message text not null check(char_length(message) between 1 and 500),
  password_hash text not null,
  status text not null default 'visible' check(status in ('visible','hidden')),
  created_at timestamptz not null default now()
);
create table public.wedding_rsvps (
  id uuid primary key default gen_random_uuid(),
  name text not null check(char_length(name) between 1 and 30),
  side text not null check(side in ('groom','bride')),
  attendance text not null check(attendance in ('yes','no','maybe')),
  guests integer not null check(guests between 0 and 10),
  meals integer not null check(meals between 0 and guests),
  note text not null default '' check(char_length(note)<=300),
  password_hash text not null,
  updated_at timestamptz not null default now(),
  check((attendance='yes' and guests>=1) or (attendance<>'yes' and guests=0 and meals=0))
);
create table public.wedding_photos (
  id uuid primary key default gen_random_uuid(),
  name text not null check(char_length(name) between 1 and 30),
  caption text not null default '' check(char_length(caption)<=200),
  path text not null unique,
  created_at timestamptz not null default now()
);
create table public.wedding_rate_limits (key text primary key, count integer not null, expires_at timestamptz not null);
-- No direct browser reads/writes, including authenticated users. All access goes
-- through the Edge Function, which checks admin identity for private records.
alter table public.wedding_messages enable row level security;
alter table public.wedding_rsvps enable row level security;
alter table public.wedding_photos enable row level security;
alter table public.wedding_rate_limits enable row level security;
revoke all on public.wedding_messages, public.wedding_rsvps, public.wedding_photos, public.wedding_rate_limits from anon, authenticated;
grant all on public.wedding_messages, public.wedding_rsvps, public.wedding_photos, public.wedding_rate_limits to service_role;
create index on public.wedding_messages(status, created_at desc);
create index on public.wedding_rsvps(updated_at desc);
create index on public.wedding_photos(created_at desc);
create or replace function public.wedding_take_limit(bucket text, maximum integer)
returns boolean language plpgsql security invoker set search_path=public,pg_temp as $$
declare used integer;
begin
  delete from public.wedding_rate_limits where expires_at < now();
  insert into public.wedding_rate_limits(key,count,expires_at) values(bucket,1,now()+interval '1 hour')
  on conflict(key) do update set count=wedding_rate_limits.count+1 returning count into used;
  return used<=maximum;
end;
$$;
revoke all on function public.wedding_take_limit(text,integer) from public,anon,authenticated;
grant execute on function public.wedding_take_limit(text,integer) to service_role;
-- The dashboard's automatic-RLS event trigger must not be callable via the Data API.
do $$
begin
  if to_regprocedure('public.rls_auto_enable()') is not null then
    revoke execute on function public.rls_auto_enable() from public, anon, authenticated;
  end if;
end;
$$;
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('wedding-guest-photos','wedding-guest-photos',false,8388608,array['image/jpeg','image/png','image/webp']);
commit;
