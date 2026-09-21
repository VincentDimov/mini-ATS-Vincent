-- Mini ATS MVP
--
-- Tenant isolation is enforced in PostgreSQL.  Browser clients only receive
-- the publishable Supabase key and must satisfy these RLS policies; the
-- service-role key is reserved for the authenticated admin provisioning route.

create extension if not exists pgcrypto;

create schema if not exists private;
revoke all on schema private from public;
grant usage on schema private to authenticated;

create table if not exists public.organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(trim(name)) between 2 and 120),
  website_url text,
  industry text,
  location text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (name)
);

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  full_name text not null default '',
  role text not null check (role in ('admin', 'customer')),
  organization_id uuid references public.organizations(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (
    (role = 'admin' and organization_id is null)
    or (role = 'customer' and organization_id is not null)
  )
);

create table if not exists public.jobs (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  created_by uuid references public.profiles(id) on delete set null,
  title text not null check (char_length(trim(title)) between 2 and 160),
  description text not null check (char_length(trim(description)) > 0),
  location text,
  employment_type text,
  notes text,
  status text not null default 'active' check (status in ('active', 'archived')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.candidates (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  job_id uuid not null references public.jobs(id) on delete cascade,
  created_by uuid references public.profiles(id) on delete set null,
  full_name text not null check (char_length(trim(full_name)) between 2 and 160),
  email text not null check (position('@' in email) > 1),
  phone text,
  linkedin_url text,
  current_title text,
  current_company text,
  notes text,
  pipeline_stage text not null default 'new'
    check (pipeline_stage in ('new', 'screening', 'interview', 'offered', 'rejected')),
  cv_path text,
  cv_filename text,
  cv_uploaded_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (job_id, email)
);

create table if not exists public.candidate_analyses (
  id uuid primary key default gen_random_uuid(),
  candidate_id uuid not null unique references public.candidates(id) on delete cascade,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  summary text not null,
  strengths jsonb not null default '[]'::jsonb,
  potential_gaps jsonb not null default '[]'::jsonb,
  matching_skills jsonb not null default '[]'::jsonb,
  interview_questions jsonb not null default '[]'::jsonb,
  model text not null,
  disclaimer text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists jobs_organization_created_idx
  on public.jobs (organization_id, created_at desc);
create index if not exists candidates_organization_stage_idx
  on public.candidates (organization_id, pipeline_stage);
create index if not exists candidates_job_created_idx
  on public.candidates (job_id, created_at desc);
create index if not exists candidates_name_lower_idx
  on public.candidates (lower(full_name));
create index if not exists profiles_organization_idx
  on public.profiles (organization_id);

create or replace function private.touch_updated_at()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create or replace function private.sync_candidate_organization()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  job_organization_id uuid;
begin
  select organization_id into job_organization_id
  from public.jobs
  where id = new.job_id;

  if job_organization_id is null then
    raise exception 'Candidate must belong to an existing job';
  end if;

  new.organization_id = job_organization_id;
  return new;
end;
$$;

create or replace function private.current_organization_id()
returns uuid
language sql
stable
security definer
set search_path = ''
as $$
  select p.organization_id
  from public.profiles as p
  where p.id = (select auth.uid())
$$;

create or replace function private.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.profiles as p
    where p.id = (select auth.uid())
      and p.role = 'admin'
  )
$$;

create or replace function private.is_member_of(target_organization_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select target_organization_id = (select private.current_organization_id())
$$;

create or replace function private.candidate_matches_organization(
  target_candidate_id uuid,
  target_organization_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.candidates as c
    where c.id = target_candidate_id
      and c.organization_id = target_organization_id
  )
$$;

create or replace function private.can_access_candidate_file(object_name text)
returns boolean
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  path_parts text[];
  path_organization_id uuid;
  path_candidate_id uuid;
begin
  path_parts := storage.foldername(object_name);

  if coalesce(array_length(path_parts, 1), 0) < 3 then
    return false;
  end if;

  begin
    path_organization_id := path_parts[1]::uuid;
    path_candidate_id := path_parts[2]::uuid;
  exception when invalid_text_representation then
    return false;
  end;

  return (select private.is_admin())
    or (
      (select private.is_member_of(path_organization_id))
      and (select private.candidate_matches_organization(path_candidate_id, path_organization_id))
    );
end;
$$;

revoke all on function private.touch_updated_at() from public;
revoke all on function private.sync_candidate_organization() from public;
revoke all on function private.current_organization_id() from public;
revoke all on function private.is_admin() from public;
revoke all on function private.is_member_of(uuid) from public;
revoke all on function private.candidate_matches_organization(uuid, uuid) from public;
revoke all on function private.can_access_candidate_file(text) from public;
grant execute on function private.current_organization_id() to authenticated;
grant execute on function private.is_admin() to authenticated;
grant execute on function private.is_member_of(uuid) to authenticated;
grant execute on function private.candidate_matches_organization(uuid, uuid) to authenticated;
grant execute on function private.can_access_candidate_file(text) to authenticated;

drop trigger if exists organizations_touch_updated_at on public.organizations;
create trigger organizations_touch_updated_at
  before update on public.organizations
  for each row execute function private.touch_updated_at();

drop trigger if exists profiles_touch_updated_at on public.profiles;
create trigger profiles_touch_updated_at
  before update on public.profiles
  for each row execute function private.touch_updated_at();

drop trigger if exists jobs_touch_updated_at on public.jobs;
create trigger jobs_touch_updated_at
  before update on public.jobs
  for each row execute function private.touch_updated_at();

drop trigger if exists candidates_touch_updated_at on public.candidates;
create trigger candidates_touch_updated_at
  before update on public.candidates
  for each row execute function private.touch_updated_at();

drop trigger if exists candidate_analyses_touch_updated_at on public.candidate_analyses;
create trigger candidate_analyses_touch_updated_at
  before update on public.candidate_analyses
  for each row execute function private.touch_updated_at();

drop trigger if exists candidates_sync_organization on public.candidates;
create trigger candidates_sync_organization
  before insert or update of job_id on public.candidates
  for each row execute function private.sync_candidate_organization();

alter table public.organizations enable row level security;
alter table public.profiles enable row level security;
alter table public.jobs enable row level security;
alter table public.candidates enable row level security;
alter table public.candidate_analyses enable row level security;

-- Policies are deliberately explicit and verb-specific.  Do not replace them
-- with broad "authenticated" or USING (true) policies.
drop policy if exists organizations_select on public.organizations;
create policy organizations_select on public.organizations
  for select to authenticated
  using (
    (select private.is_admin())
    or (select private.is_member_of(id))
  );

drop policy if exists profiles_select on public.profiles;
create policy profiles_select on public.profiles
  for select to authenticated
  using (
    id = (select auth.uid())
    or (select private.is_admin())
  );

drop policy if exists jobs_select on public.jobs;
create policy jobs_select on public.jobs
  for select to authenticated
  using (
    (select private.is_admin())
    or (select private.is_member_of(organization_id))
  );

drop policy if exists jobs_insert on public.jobs;
create policy jobs_insert on public.jobs
  for insert to authenticated
  with check (
    (select private.is_admin())
    or (select private.is_member_of(organization_id))
  );

drop policy if exists jobs_update on public.jobs;
create policy jobs_update on public.jobs
  for update to authenticated
  using (
    (select private.is_admin())
    or (select private.is_member_of(organization_id))
  )
  with check (
    (select private.is_admin())
    or (select private.is_member_of(organization_id))
  );

drop policy if exists jobs_delete on public.jobs;
create policy jobs_delete on public.jobs
  for delete to authenticated
  using (
    (select private.is_admin())
    or (select private.is_member_of(organization_id))
  );

drop policy if exists candidates_select on public.candidates;
create policy candidates_select on public.candidates
  for select to authenticated
  using (
    (select private.is_admin())
    or (select private.is_member_of(organization_id))
  );

drop policy if exists candidates_insert on public.candidates;
create policy candidates_insert on public.candidates
  for insert to authenticated
  with check (
    ((select private.is_admin()) or (select private.is_member_of(organization_id)))
    and exists (
      select 1
      from public.jobs as j
      where j.id = job_id
        and j.organization_id = organization_id
    )
  );

drop policy if exists candidates_update on public.candidates;
create policy candidates_update on public.candidates
  for update to authenticated
  using (
    (select private.is_admin())
    or (select private.is_member_of(organization_id))
  )
  with check (
    ((select private.is_admin()) or (select private.is_member_of(organization_id)))
    and exists (
      select 1
      from public.jobs as j
      where j.id = job_id
        and j.organization_id = organization_id
    )
  );

drop policy if exists candidates_delete on public.candidates;
create policy candidates_delete on public.candidates
  for delete to authenticated
  using (
    (select private.is_admin())
    or (select private.is_member_of(organization_id))
  );

drop policy if exists candidate_analyses_select on public.candidate_analyses;
create policy candidate_analyses_select on public.candidate_analyses
  for select to authenticated
  using (
    (select private.is_admin())
    or (select private.is_member_of(organization_id))
  );

drop policy if exists candidate_analyses_insert on public.candidate_analyses;
create policy candidate_analyses_insert on public.candidate_analyses
  for insert to authenticated
  with check (
    ((select private.is_admin()) or (select private.is_member_of(organization_id)))
    and (select private.candidate_matches_organization(candidate_id, organization_id))
  );

drop policy if exists candidate_analyses_update on public.candidate_analyses;
create policy candidate_analyses_update on public.candidate_analyses
  for update to authenticated
  using (
    (select private.is_admin())
    or (select private.is_member_of(organization_id))
  )
  with check (
    ((select private.is_admin()) or (select private.is_member_of(organization_id)))
    and (select private.candidate_matches_organization(candidate_id, organization_id))
  );

drop policy if exists candidate_analyses_delete on public.candidate_analyses;
create policy candidate_analyses_delete on public.candidate_analyses
  for delete to authenticated
  using ((select private.is_admin()));

revoke all on public.organizations, public.profiles, public.jobs,
  public.candidates, public.candidate_analyses from anon;
revoke all on public.organizations, public.profiles, public.jobs,
  public.candidates, public.candidate_analyses from authenticated;
grant select on public.organizations, public.profiles to authenticated;
grant select, insert, update, delete on public.jobs to authenticated;
grant select, insert, update, delete on public.candidates to authenticated;
grant select, insert, update, delete on public.candidate_analyses to authenticated;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('candidate-cvs', 'candidate-cvs', false, 5242880, array['application/pdf'])
on conflict (id) do update
set public = excluded.public,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists candidate_cvs_select on storage.objects;
create policy candidate_cvs_select on storage.objects
  for select to authenticated
  using (
    bucket_id = 'candidate-cvs'
    and (select private.can_access_candidate_file(name))
  );

drop policy if exists candidate_cvs_insert on storage.objects;
create policy candidate_cvs_insert on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'candidate-cvs'
    and (select private.can_access_candidate_file(name))
  );

drop policy if exists candidate_cvs_update on storage.objects;
create policy candidate_cvs_update on storage.objects
  for update to authenticated
  using (
    bucket_id = 'candidate-cvs'
    and (select private.can_access_candidate_file(name))
  )
  with check (
    bucket_id = 'candidate-cvs'
    and (select private.can_access_candidate_file(name))
  );

drop policy if exists candidate_cvs_delete on storage.objects;
create policy candidate_cvs_delete on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'candidate-cvs'
    and (select private.can_access_candidate_file(name))
  );
