-- Deenijora database schema (Supabase / Postgres 15+)
-- Run once in Supabase Dashboard → SQL Editor. Safe to re-run only on an empty project.
-- Privacy model:
--   * biodatas        : non-identifying info, visible to logged-in users only when approved
--   * biodata_private : name + phone numbers, visible ONLY to the owner and admins
--   * Contacts are never exchanged automatically; an admin introduces families after both consent.

-- ---------- Types ----------
create type biodata_status as enum ('draft', 'pending', 'approved', 'needs_changes', 'hidden');
create type request_status as enum ('pending', 'accepted', 'declined', 'introduced', 'cancelled');
create type fav_kind as enum ('like', 'dislike');

-- ---------- Profiles ----------
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  role text not null default 'user' check (role in ('user', 'admin')),
  created_at timestamptz not null default now()
);

create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id) values (new.id) on conflict do nothing;
  return new;
end $$;

create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

create or replace function public.is_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from profiles where id = auth.uid() and role = 'admin');
$$;

-- ---------- Biodatas ----------
create sequence biodata_code_seq start 1001;

create table public.biodatas (
  id uuid primary key default gen_random_uuid(),
  code text not null unique default ('DJ-' || nextval('biodata_code_seq')),
  user_id uuid not null unique references auth.users (id) on delete cascade,
  status biodata_status not null default 'draft',
  review_note text,

  gender text not null check (gender in ('male', 'female')),
  birth_year int not null check (birth_year between 1950 and extract(year from now())::int - 18),
  height_cm int check (height_cm between 120 and 230),
  marital_status text not null check (marital_status in ('never_married', 'divorced', 'widowed', 'married')),
  district text not null check (char_length(district) <= 40),
  current_location text check (char_length(current_location) <= 80),

  education text not null check (char_length(education) <= 200),
  occupation text not null check (char_length(occupation) <= 200),

  salah text not null check (salah in ('five_daily', 'mostly', 'trying')),
  quran text check (quran in ('fluent', 'learning', 'no')),
  religious_notes text check (char_length(religious_notes) <= 1000),

  family_notes text check (char_length(family_notes) <= 1000),
  about text check (char_length(about) <= 1500),

  partner_age_min int check (partner_age_min between 18 and 80),
  partner_age_max int check (partner_age_max between 18 and 80),
  partner_expectations text check (char_length(partner_expectations) <= 1500),

  guardian_relation text not null check (char_length(guardian_relation) <= 40),
  consent_publish boolean not null default false,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  approved_at timestamptz,
  check (partner_age_min is null or partner_age_max is null or partner_age_min <= partner_age_max)
);
create index biodatas_search_idx on public.biodatas (status, gender, district, birth_year);

create table public.biodata_private (
  biodata_id uuid primary key references public.biodatas (id) on delete cascade,
  full_name text not null check (char_length(full_name) between 2 and 80),
  phone text not null check (phone ~ '^\+?[0-9 ]{10,16}$'),
  guardian_name text not null check (char_length(guardian_name) between 2 and 80),
  guardian_phone text not null check (guardian_phone ~ '^\+?[0-9 ]{10,16}$')
);

-- Owners may only move status to draft/pending; any owner edit of a live biodata
-- sends it back to review. Only admins can approve / reject / hide.
create or replace function public.guard_biodata() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  new.updated_at := now();
  if public.is_admin() then
    if new.status = 'approved' and (tg_op = 'INSERT' or old.status <> 'approved') then
      new.approved_at := now();
    end if;
    return new;
  end if;

  if tg_op = 'UPDATE' then
    new.user_id := old.user_id;
    new.code := old.code;
    new.approved_at := old.approved_at;
    new.review_note := old.review_note;
  else
    new.review_note := null;
    new.approved_at := null;
  end if;

  if new.status not in ('draft', 'pending') then
    new.status := 'pending';
  end if;
  if new.status = 'pending' and not new.consent_publish then
    raise exception 'consent_required';
  end if;
  return new;
end $$;

create trigger biodatas_guard before insert or update on public.biodatas
  for each row execute function public.guard_biodata();

-- ---------- Favourites (like / dislike) ----------
create table public.favourites (
  user_id uuid not null references auth.users (id) on delete cascade,
  biodata_id uuid not null references public.biodatas (id) on delete cascade,
  kind fav_kind not null,
  created_at timestamptz not null default now(),
  primary key (user_id, biodata_id)
);

-- ---------- Profile views ----------
create table public.profile_views (
  id bigint generated always as identity primary key,
  biodata_id uuid not null references public.biodatas (id) on delete cascade,
  viewer_id uuid not null references auth.users (id) on delete cascade,
  viewed_at timestamptz not null default now()
);
create index profile_views_bid_idx on public.profile_views (biodata_id, viewed_at);

-- ---------- Interest requests ----------
create table public.interest_requests (
  id uuid primary key default gen_random_uuid(),
  from_user uuid not null references auth.users (id) on delete cascade,
  to_biodata uuid not null references public.biodatas (id) on delete cascade,
  message text check (char_length(message) <= 500),
  status request_status not null default 'pending',
  admin_note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index one_open_request on public.interest_requests (from_user, to_biodata)
  where status in ('pending', 'accepted');

-- ---------- Reports / support ----------
create table public.reports (
  id uuid primary key default gen_random_uuid(),
  reporter uuid not null references auth.users (id) on delete cascade,
  biodata_id uuid references public.biodatas (id) on delete set null,
  message text not null check (char_length(message) between 5 and 1500),
  status text not null default 'open' check (status in ('open', 'resolved')),
  created_at timestamptz not null default now()
);

-- ---------- Row level security ----------
alter table public.profiles enable row level security;
alter table public.biodatas enable row level security;
alter table public.biodata_private enable row level security;
alter table public.favourites enable row level security;
alter table public.profile_views enable row level security;
alter table public.interest_requests enable row level security;
alter table public.reports enable row level security;

create policy profiles_read on public.profiles for select using (id = auth.uid() or public.is_admin());
create policy profiles_admin on public.profiles for update using (public.is_admin());

create policy biodatas_read on public.biodatas for select using (
  user_id = auth.uid() or public.is_admin() or (status = 'approved' and auth.uid() is not null)
);
create policy biodatas_insert on public.biodatas for insert with check (user_id = auth.uid());
create policy biodatas_update on public.biodatas for update
  using (user_id = auth.uid() or public.is_admin())
  with check (user_id = auth.uid() or public.is_admin());
create policy biodatas_delete on public.biodatas for delete using (user_id = auth.uid() or public.is_admin());

create policy private_owner on public.biodata_private for all
  using (exists (select 1 from biodatas b where b.id = biodata_id and b.user_id = auth.uid()))
  with check (exists (select 1 from biodatas b where b.id = biodata_id and b.user_id = auth.uid()));
create policy private_admin on public.biodata_private for select using (public.is_admin());

create policy fav_own on public.favourites for all using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy views_admin on public.profile_views for select using (public.is_admin());

create policy req_read on public.interest_requests for select using (
  from_user = auth.uid() or public.is_admin()
  or exists (select 1 from biodatas b where b.id = to_biodata and b.user_id = auth.uid())
);
create policy req_admin on public.interest_requests for update using (public.is_admin());

create policy reports_insert on public.reports for insert with check (reporter = auth.uid());
create policy reports_read on public.reports for select using (reporter = auth.uid() or public.is_admin());
create policy reports_admin on public.reports for update using (public.is_admin());

-- ---------- RPCs (all checks happen server-side) ----------

-- Record a view (ignores own biodata, max one per viewer per biodata per day)
create or replace function public.record_view(bid uuid) returns void
language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then return; end if;
  if exists (select 1 from biodatas where id = bid and user_id = auth.uid()) then return; end if;
  if not exists (select 1 from biodatas where id = bid and status = 'approved') then return; end if;
  if exists (select 1 from profile_views where biodata_id = bid and viewer_id = auth.uid()
             and viewed_at > now() - interval '1 day') then return; end if;
  insert into profile_views (biodata_id, viewer_id) values (bid, auth.uid());
end $$;

-- Dashboard numbers for the current user
create or replace function public.my_stats() returns json
language sql stable security definer set search_path = public as $$
  with mine as (select id from biodatas where user_id = auth.uid())
  select json_build_object(
    'views_today', (select count(*) from profile_views where biodata_id in (select id from mine) and viewed_at > date_trunc('day', now())),
    'views_7',     (select count(*) from profile_views where biodata_id in (select id from mine) and viewed_at > now() - interval '7 days'),
    'views_30',    (select count(*) from profile_views where biodata_id in (select id from mine) and viewed_at > now() - interval '30 days'),
    'liked_me',    (select count(*) from favourites where kind = 'like' and biodata_id in (select id from mine)),
    'likes',       (select count(*) from favourites where kind = 'like' and user_id = auth.uid()),
    'dislikes',    (select count(*) from favourites where kind = 'dislike' and user_id = auth.uid()),
    'sent',        (select count(*) from interest_requests where from_user = auth.uid()),
    'received',    (select count(*) from interest_requests where to_biodata in (select id from mine))
  );
$$;

-- Send an interest request: sender needs an approved biodata, cannot target self.
create or replace function public.send_interest(bid uuid, msg text) returns uuid
language plpgsql security definer set search_path = public as $$
declare rid uuid;
begin
  if auth.uid() is null then raise exception 'not_logged_in'; end if;
  if not exists (select 1 from biodatas where user_id = auth.uid() and status = 'approved') then
    raise exception 'own_biodata_not_approved';
  end if;
  if not exists (select 1 from biodatas where id = bid and status = 'approved' and user_id <> auth.uid()) then
    raise exception 'target_unavailable';
  end if;
  insert into interest_requests (from_user, to_biodata, message)
  values (auth.uid(), bid, left(msg, 500)) returning id into rid;
  return rid;
end $$;

-- Recipient answers; sender may cancel while pending.
create or replace function public.respond_interest(rid uuid, accept boolean) returns void
language plpgsql security definer set search_path = public as $$
begin
  update interest_requests r
     set status = case when accept then 'accepted'::request_status else 'declined'::request_status end,
         updated_at = now()
   where r.id = rid and r.status = 'pending'
     and exists (select 1 from biodatas b where b.id = r.to_biodata and b.user_id = auth.uid());
  if not found then raise exception 'not_allowed'; end if;
end $$;

create or replace function public.cancel_interest(rid uuid) returns void
language plpgsql security definer set search_path = public as $$
begin
  update interest_requests set status = 'cancelled', updated_at = now()
   where id = rid and from_user = auth.uid() and status = 'pending';
  if not found then raise exception 'not_allowed'; end if;
end $$;

-- Sender's own biodata code for a request (recipient sees who is interested, never contacts)
create or replace function public.request_sender_code(rid uuid) returns text
language sql stable security definer set search_path = public as $$
  select b.code from interest_requests r
    join biodatas b on b.user_id = r.from_user
    join biodatas t on t.id = r.to_biodata
   where r.id = rid and (t.user_id = auth.uid() or public.is_admin());
$$;

-- Delete my account data (biodata, favourites, requests cascade via biodata / user)
create or replace function public.delete_my_biodata() returns void
language sql security definer set search_path = public as $$
  delete from biodatas where user_id = auth.uid();
  delete from favourites where user_id = auth.uid();
  delete from interest_requests where from_user = auth.uid();
$$;

revoke all on function public.record_view, public.my_stats, public.send_interest, public.respond_interest,
  public.cancel_interest, public.request_sender_code, public.delete_my_biodata from anon, public;
grant execute on function public.record_view, public.my_stats, public.send_interest, public.respond_interest,
  public.cancel_interest, public.request_sender_code, public.delete_my_biodata to authenticated;

-- Make yourself admin after first login (replace the email):
-- update public.profiles set role = 'admin' where id = (select id from auth.users where email = 'you@example.com');
