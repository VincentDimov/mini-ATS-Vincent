-- Additive collaboration upgrade. Existing organizations, jobs and candidates are preserved.
alter table public.profiles add column is_active boolean not null default true;
alter table public.profiles add column is_org_manager boolean not null default false;
-- Managers are assigned explicitly by a platform admin; no account is promoted automatically.
alter table public.profiles add constraint profiles_id_org_unique unique (id, organization_id);
alter table public.jobs add column salary_range text;
alter table public.jobs add column assigned_to uuid references public.profiles(id) on delete set null;
alter table public.jobs add column restricted boolean not null default false;
alter table public.jobs add constraint jobs_id_org_unique unique (id, organization_id);
alter table public.candidates add column tags text[] not null default '{}';
alter table public.candidates add constraint candidates_tags_limit check (cardinality(tags) <= 12);
alter table public.candidates add constraint candidates_id_org_unique unique (id, organization_id);

create table public.job_groups (
 id uuid primary key default gen_random_uuid(),
 organization_id uuid not null references public.organizations(id) on delete cascade,
 name text not null check (length(trim(name)) between 2 and 100),
 description text not null default '',
 created_at timestamptz not null default now(),
 unique(id, organization_id), unique(organization_id, name)
);
create table public.group_members (
 id uuid primary key default gen_random_uuid(),
 organization_id uuid not null references public.organizations(id) on delete cascade,
 group_id uuid not null, profile_id uuid not null,
 foreign key(group_id, organization_id) references public.job_groups(id, organization_id) on delete cascade,
 foreign key(profile_id, organization_id) references public.profiles(id, organization_id) on delete cascade,
 unique(group_id, profile_id)
);
create table public.group_jobs (
 id uuid primary key default gen_random_uuid(),
 organization_id uuid not null references public.organizations(id) on delete cascade,
 group_id uuid not null, job_id uuid not null,
 foreign key(group_id, organization_id) references public.job_groups(id, organization_id) on delete cascade,
 foreign key(job_id, organization_id) references public.jobs(id, organization_id) on delete cascade,
 unique(group_id, job_id)
);
create table public.candidate_notes (
 id uuid primary key default gen_random_uuid(),
 organization_id uuid not null references public.organizations(id) on delete cascade,
 candidate_id uuid not null,
 author_id uuid references public.profiles(id) on delete set null,
 body text not null check(length(trim(body)) between 1 and 6000),
 created_at timestamptz not null default now(),
 foreign key(candidate_id, organization_id) references public.candidates(id, organization_id) on delete cascade
);
create table public.interviews (
 id uuid primary key default gen_random_uuid(),
 organization_id uuid not null references public.organizations(id) on delete cascade,
 candidate_id uuid not null,
 created_by uuid references public.profiles(id) on delete set null,
 title text not null check(length(trim(title)) between 2 and 160),
 starts_at timestamptz not null,
 ends_at timestamptz not null,
 location text not null default '',
 notes text not null default '',
 status text not null default 'scheduled' check(status in ('scheduled','completed','cancelled')),
 created_at timestamptz not null default now(),
 check(ends_at > starts_at and ends_at <= starts_at + interval '8 hours'),
 foreign key(candidate_id, organization_id) references public.candidates(id, organization_id) on delete cascade
);
create table public.activity_log (
 id uuid primary key default gen_random_uuid(),
 organization_id uuid,
 job_id uuid,
 actor_id uuid,
 actor_name text not null,
 action text not null,
 entity_type text not null,
 entity_id uuid not null,
 entity_name text not null,
 details jsonb not null default '{}',
 created_at timestamptz not null default now()
);
create index jobs_assigned_idx on public.jobs(assigned_to);
create index jobs_creator_idx on public.jobs(created_by);
create index candidates_creator_idx on public.candidates(created_by);
create index analyses_org_idx on public.candidate_analyses(organization_id);
create index groups_org_idx on public.job_groups(organization_id);
create index members_org_idx on public.group_members(organization_id);
create index members_profile_idx on public.group_members(profile_id, group_id);
create index group_jobs_org_idx on public.group_jobs(organization_id);
create index group_jobs_job_idx on public.group_jobs(job_id, group_id);
create index candidate_notes_candidate_idx on public.candidate_notes(candidate_id,created_at);
create index candidate_notes_org_idx on public.candidate_notes(organization_id);
create index candidate_notes_author_idx on public.candidate_notes(author_id);
create index interviews_candidate_idx on public.interviews(candidate_id);
create index interviews_org_date_idx on public.interviews(organization_id,starts_at);
create index interviews_creator_idx on public.interviews(created_by);
create index activity_org_date_idx on public.activity_log(organization_id,created_at desc);
create index activity_job_idx on public.activity_log(job_id);
create index activity_actor_idx on public.activity_log(actor_id);

create or replace function private.current_organization_id() returns uuid language sql stable security definer set search_path = '' as $$
 select organization_id from public.profiles where id=(select auth.uid()) and is_active
$$;
create or replace function private.is_admin() returns boolean language sql stable security definer set search_path = '' as $$
 select exists(select 1 from public.profiles where id=(select auth.uid()) and role='admin' and is_active)
$$;
create function private.manages_org(target uuid) returns boolean language sql stable security definer set search_path = '' as $$
 select (select private.is_admin()) or exists(select 1 from public.profiles where id=(select auth.uid()) and organization_id=target and is_active and is_org_manager)
$$;
create function private.can_access_job(target uuid) returns boolean language sql stable security definer set search_path = '' as $$
 select auth.uid() is not null and exists(
 select 1 from public.jobs j where j.id=target and (
 (select private.is_admin()) or (
 j.organization_id=(select private.current_organization_id()) and (
 not j.restricted or private.manages_org(j.organization_id) or j.assigned_to=(select auth.uid()) or j.created_by=(select auth.uid())
 or exists(select 1 from public.group_jobs gj join public.group_members gm on gm.group_id=gj.group_id where gj.job_id=j.id and gm.profile_id=(select auth.uid()))
 ))))
$$;
create function private.can_access_candidate(target uuid) returns boolean language sql stable security definer set search_path = '' as $$
 select auth.uid() is not null and exists(select 1 from public.candidates c where c.id=target and private.can_access_job(c.job_id))
$$;
revoke all on function private.manages_org(uuid), private.can_access_job(uuid), private.can_access_candidate(uuid) from public, anon;
grant execute on function private.manages_org(uuid), private.can_access_job(uuid), private.can_access_candidate(uuid) to authenticated;

drop policy profiles_select on public.profiles;
create policy profiles_select on public.profiles for select to authenticated using (
 id=(select auth.uid()) or (select private.is_admin()) or organization_id=(select private.current_organization_id())
);
grant update(full_name, role, organization_id, is_active, is_org_manager) on public.profiles to authenticated;
create policy profiles_update on public.profiles for update to authenticated
 using ((select private.is_admin()) or private.manages_org(organization_id))
 with check ((select private.is_admin()) or private.manages_org(organization_id));
create function private.guard_profile() returns trigger language plpgsql security definer set search_path = '' as $$
begin
 if auth.uid() is not null then
  if not private.is_admin() and (
   old.organization_id is distinct from new.organization_id or old.role is distinct from new.role
   or old.is_org_manager is distinct from new.is_org_manager or old.is_org_manager or old.role='admin'
  ) then raise exception 'Only platform administrators can change privileged accounts'; end if;
  if old.id=auth.uid() and (not new.is_active or old.role is distinct from new.role or old.organization_id is distinct from new.organization_id) then
   raise exception 'You cannot remove your own access';
  end if;
 end if;
 return new;
end; $$;
revoke all on function private.guard_profile() from public, anon, authenticated;
create trigger profiles_guard before update on public.profiles for each row execute function private.guard_profile();

grant insert,update,delete on public.organizations to authenticated;
create policy organizations_insert on public.organizations for insert to authenticated with check((select private.is_admin()));
create policy organizations_update on public.organizations for update to authenticated using((select private.is_admin())) with check((select private.is_admin()));
create policy organizations_delete on public.organizations for delete to authenticated using((select private.is_admin()));

create function private.guard_job_access() returns trigger language plpgsql security definer set search_path = '' as $$
begin
 if auth.uid() is not null then
  if tg_op='INSERT' then new.created_by:=auth.uid(); end if;
  if tg_op='UPDATE' and new.created_by is distinct from old.created_by then raise exception 'Job creator cannot be changed'; end if;
 end if;
 if new.assigned_to is not null and (tg_op='INSERT' or new.assigned_to is distinct from old.assigned_to or new.organization_id is distinct from old.organization_id)
 and not exists(select 1 from public.profiles where id=new.assigned_to and organization_id=new.organization_id and is_active) then
  raise exception 'Assign jobs only to active members of the same workspace';
 end if;
 if auth.uid() is not null and not private.manages_org(new.organization_id) then
  if tg_op='INSERT' and (new.restricted or new.assigned_to is not null) then raise exception 'Only workspace managers can configure access'; end if;
  if tg_op='UPDATE' and (new.assigned_to is distinct from old.assigned_to or new.restricted is distinct from old.restricted or new.organization_id is distinct from old.organization_id) then
   raise exception 'Only workspace managers can configure access';
  end if;
 end if;
 return new;
end; $$;
revoke all on function private.guard_job_access() from public, anon, authenticated;
create trigger jobs_access_guard before insert or update on public.jobs for each row execute function private.guard_job_access();

drop policy jobs_select on public.jobs;
drop policy jobs_update on public.jobs;
drop policy jobs_delete on public.jobs;
-- SELECT must check the row's fields directly: a STABLE helper re-reading jobs
-- cannot see a just-inserted row during INSERT ... RETURNING.
create policy jobs_select on public.jobs for select to authenticated using(
 (select private.is_admin()) or (organization_id=(select private.current_organization_id()) and (
 not restricted or private.manages_org(organization_id) or assigned_to=(select auth.uid()) or created_by=(select auth.uid())
 or exists(select 1 from public.group_jobs gj join public.group_members gm on gm.group_id=gj.group_id where gj.job_id=jobs.id and gm.profile_id=(select auth.uid()))
 ))
);
create policy jobs_update on public.jobs for update to authenticated using(private.can_access_job(id)) with check((select private.is_admin()) or organization_id=(select private.current_organization_id()));
create policy jobs_delete on public.jobs for delete to authenticated using(private.can_access_job(id));
drop policy candidates_select on public.candidates;
drop policy candidates_update on public.candidates;
drop policy candidates_delete on public.candidates;
create policy candidates_select on public.candidates for select to authenticated using(private.can_access_job(job_id));
create policy candidates_update on public.candidates for update to authenticated using(private.can_access_job(job_id)) with check(private.can_access_job(job_id));
create policy candidates_delete on public.candidates for delete to authenticated using(private.can_access_job(job_id));
drop policy candidate_analyses_select on public.candidate_analyses;
drop policy candidate_analyses_insert on public.candidate_analyses;
drop policy candidate_analyses_update on public.candidate_analyses;
create policy candidate_analyses_select on public.candidate_analyses for select to authenticated using(private.can_access_candidate(candidate_id));
create policy candidate_analyses_insert on public.candidate_analyses for insert to authenticated with check(private.can_access_candidate(candidate_id) and private.candidate_matches_organization(candidate_id,organization_id));
create policy candidate_analyses_update on public.candidate_analyses for update to authenticated using(private.can_access_candidate(candidate_id)) with check(private.can_access_candidate(candidate_id) and private.candidate_matches_organization(candidate_id,organization_id));
create or replace function private.can_access_candidate_file(object_name text) returns boolean language plpgsql stable security definer set search_path = '' as $$
declare parts text[]; cid uuid; oid uuid;
begin
 parts:=storage.foldername(object_name);
 if coalesce(array_length(parts,1),0)<2 then return false; end if;
 begin oid:=parts[1]::uuid; cid:=parts[2]::uuid; exception when invalid_text_representation then return false; end;
 return private.candidate_matches_organization(cid,oid) and private.can_access_candidate(cid);
end; $$;

alter table public.job_groups enable row level security;
alter table public.group_members enable row level security;
alter table public.group_jobs enable row level security;
alter table public.candidate_notes enable row level security;
alter table public.interviews enable row level security;
alter table public.activity_log enable row level security;
create policy groups_read on public.job_groups for select to authenticated using((select private.is_admin()) or organization_id=(select private.current_organization_id()));
create policy groups_write on public.job_groups for all to authenticated using(private.manages_org(organization_id)) with check(private.manages_org(organization_id));
create policy members_read on public.group_members for select to authenticated using((select private.is_admin()) or organization_id=(select private.current_organization_id()));
create policy members_write on public.group_members for all to authenticated using(private.manages_org(organization_id)) with check(private.manages_org(organization_id));
create policy group_jobs_read on public.group_jobs for select to authenticated using((select private.is_admin()) or organization_id=(select private.current_organization_id()));
create policy group_jobs_write on public.group_jobs for all to authenticated using(private.manages_org(organization_id)) with check(private.manages_org(organization_id));
create policy notes_read on public.candidate_notes for select to authenticated using(private.can_access_candidate(candidate_id));
create policy notes_insert on public.candidate_notes for insert to authenticated with check(private.can_access_candidate(candidate_id) and author_id=(select auth.uid()));
create policy notes_delete on public.candidate_notes for delete to authenticated using(private.can_access_candidate(candidate_id) and (author_id=(select auth.uid()) or private.manages_org(organization_id)));
create policy interviews_read on public.interviews for select to authenticated using(private.can_access_candidate(candidate_id));
create policy interviews_insert on public.interviews for insert to authenticated with check(private.can_access_candidate(candidate_id) and created_by=(select auth.uid()));
create policy interviews_update on public.interviews for update to authenticated using(private.can_access_candidate(candidate_id)) with check(private.can_access_candidate(candidate_id));
create policy interviews_delete on public.interviews for delete to authenticated using(private.can_access_candidate(candidate_id));
create policy activity_read on public.activity_log for select to authenticated using(
 (select private.is_admin()) or (organization_id=(select private.current_organization_id()) and
 (private.manages_org(organization_id) or actor_id=(select auth.uid()) or private.can_access_job(job_id)))
);
revoke all on public.job_groups,public.group_members,public.group_jobs,public.candidate_notes,public.interviews,public.activity_log from anon,authenticated;
grant select,insert,update,delete on public.job_groups,public.group_members,public.group_jobs,public.interviews to authenticated;
grant select,insert,delete on public.candidate_notes to authenticated;
grant select on public.activity_log to authenticated;
grant all on public.job_groups,public.group_members,public.group_jobs,public.candidate_notes,public.interviews,public.activity_log to service_role;

-- Immutable, transaction-bound audit events; never copy CVs, passwords or notes into logs.
create function private.audit_change() returns trigger language plpgsql security definer set search_path = '' as $$
declare row_data jsonb; prior jsonb; oid uuid; jid uuid; label text; actor text;
begin
 row_data:=case when tg_op='DELETE' then to_jsonb(old) else to_jsonb(new) end;
 prior:=case when tg_op='UPDATE' then to_jsonb(old) else '{}'::jsonb end;
 oid:=case when tg_table_name='organizations' then (row_data->>'id')::uuid else (row_data->>'organization_id')::uuid end;
 jid:=case when tg_table_name='jobs' then (row_data->>'id')::uuid when tg_table_name='candidates' then (row_data->>'job_id')::uuid else null end;
 if tg_table_name in ('interviews','candidate_notes') then select job_id into jid from public.candidates where id=(row_data->>'candidate_id')::uuid; end if;
 label:=coalesce(row_data->>'title',row_data->>'name',row_data->>'full_name',tg_table_name);
 select coalesce(nullif(full_name,''),email) into actor from public.profiles where id=auth.uid();
 insert into public.activity_log(organization_id,job_id,actor_id,actor_name,action,entity_type,entity_id,entity_name,details)
 values(oid,jid,auth.uid(),coalesce(actor,'System'),lower(tg_op),tg_table_name,(row_data->>'id')::uuid,label,
 jsonb_strip_nulls(jsonb_build_object('from_stage',prior->>'pipeline_stage','to_stage',row_data->>'pipeline_stage','status',row_data->>'status')));
 return coalesce(new,old);
end; $$;
revoke all on function private.audit_change() from public,anon,authenticated;
do $$ declare t text; begin
 foreach t in array array['organizations','profiles','jobs','candidates','job_groups','group_members','group_jobs','candidate_notes','interviews'] loop
 execute format('create trigger %I after insert or update or delete on public.%I for each row execute function private.audit_change()',t||'_audit',t);
 end loop;
end; $$;

create function public.move_candidates(candidate_ids uuid[], next_stage text)
returns integer language plpgsql security invoker set search_path = '' as $$
declare changed integer;
begin
 if auth.uid() is null or cardinality(candidate_ids) not between 1 and 100 or
 next_stage not in ('new','screening','interview','offered','rejected') then
 raise exception 'Choose 1–100 candidates and a valid stage'; end if;
 update public.candidates set pipeline_stage=next_stage where id=any(candidate_ids);
 get diagnostics changed = row_count;
 if changed<>(select count(distinct id) from unnest(candidate_ids) as x(id)) then
 raise exception 'Some candidates are unavailable. No changes were saved'; end if;
 return changed;
end; $$;
revoke all on function public.move_candidates(uuid[],text) from public,anon;
grant execute on function public.move_candidates(uuid[],text) to authenticated;
