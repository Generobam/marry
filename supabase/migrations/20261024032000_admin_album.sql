begin;
create table public.wedding_album (
  id uuid primary key default gen_random_uuid(),
  type text not null check(type in ('image','video')),
  caption text not null default '' check(char_length(caption)<=200),
  alt text not null check(char_length(alt) between 1 and 200),
  path text not null unique,
  created_at timestamptz not null default now()
);
alter table public.wedding_album enable row level security;
revoke all on public.wedding_album from anon, authenticated;
grant all on public.wedding_album to service_role;
create index on public.wedding_album(created_at, id);
-- Only media deliberately published by an authenticated wedding administrator.
-- Upload/update/delete still require the server; no client storage write policy.
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('wedding-album','wedding-album',true,52428800,array['image/jpeg','image/png','image/webp','video/mp4','video/webm']);
commit;
