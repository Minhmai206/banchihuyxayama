-- Run this once in Supabase SQL Editor.
-- Create the admin account under Authentication > Users first.
-- Then insert that user's UUID into public.admin_users (example below).

create table if not exists public.admin_users (
  user_id uuid primary key references auth.users (id) on delete cascade,
  created_at timestamptz not null default now()
);

create table if not exists public.articles (
  id bigint primary key,
  title text not null,
  body text not null,
  category text not null default '',
  image text not null default '',
  images jsonb not null default '[]'::jsonb,
  video text not null default '',
  media_paths jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now()
);

alter table public.admin_users enable row level security;
alter table public.articles enable row level security;

grant select on public.articles to anon, authenticated;
grant insert, update, delete on public.articles to authenticated;
grant select on public.admin_users to authenticated;

drop policy if exists "Admins can read own membership" on public.admin_users;
create policy "Admins can read own membership"
  on public.admin_users for select to authenticated
  using (user_id = (select auth.uid()));

create or replace function public.is_article_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.admin_users
    where user_id = (select auth.uid())
  );
$$;

revoke all on function public.is_article_admin() from public;
grant execute on function public.is_article_admin() to authenticated;

drop policy if exists "Anyone can read articles" on public.articles;
create policy "Anyone can read articles"
  on public.articles for select to anon, authenticated
  using (true);

drop policy if exists "Admins can insert articles" on public.articles;
create policy "Admins can insert articles"
  on public.articles for insert to authenticated
  with check ((select public.is_article_admin()));

drop policy if exists "Admins can update articles" on public.articles;
create policy "Admins can update articles"
  on public.articles for update to authenticated
  using ((select public.is_article_admin()))
  with check ((select public.is_article_admin()));

drop policy if exists "Admins can delete articles" on public.articles;
create policy "Admins can delete articles"
  on public.articles for delete to authenticated
  using ((select public.is_article_admin()));

insert into storage.buckets (
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
)
values (
  'article-media',
  'article-media',
  true,
  52428800,
  array[
    'image/jpeg',
    'image/png',
    'image/gif',
    'image/webp',
    'image/avif',
    'image/bmp',
    'video/mp4',
    'video/webm',
    'video/ogg'
  ]
)
on conflict (id) do update
set public = excluded.public,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Admins can upload article media" on storage.objects;
create policy "Admins can upload article media"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'article-media'
    and (select public.is_article_admin())
  );

drop policy if exists "Admins can delete article media" on storage.objects;
create policy "Admins can delete article media"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'article-media'
    and (select public.is_article_admin())
  );

do $$
begin
  if not exists (
    select 1
    from auth.users
    where id = '45a299dc-7696-492e-8d32-fc1aeca439f7'
  ) then
    raise exception 'Không tìm thấy UID này trong Auth của project Supabase hiện tại.';
  end if;

  insert into public.admin_users (user_id)
  values ('45a299dc-7696-492e-8d32-fc1aeca439f7')
  on conflict (user_id) do nothing;
end
$$;
