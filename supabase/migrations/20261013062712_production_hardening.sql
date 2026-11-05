-- Additive production hardening. Apply after the collaboration migration.
alter table public.jobs add column context_version bigint not null default 1;
alter table public.candidates add column cv_request_id uuid;
alter table public.candidates add column analysis_request_id uuid;
alter table public.candidates add column retain_until timestamptz;
alter table public.candidate_analyses add column cv_path text;
alter table public.candidate_analyses add column job_id uuid;
alter table public.candidate_analyses add column job_context_version bigint;
alter table public.candidate_analyses add column stale boolean not null default true;

-- This registry is also the transactional cleanup outbox. No FK cascade: paths
-- must survive candidate/organization deletion until Storage confirms removal.
create table public.cv_files (
 path text primary key,
 candidate_id uuid not null,
 organization_id uuid not null,
 request_id uuid not null default gen_random_uuid(),
 state text not null check(state in ('reserved','current','queued','deleting','deleted')),
 size_bytes bigint not null check(size_bytes between 0 and 5242880),
 sha256 text,
 created_at timestamptz not null default now(),
 next_attempt_at timestamptz not null default now(),
 attempts integer not null default 0,
 lease_id uuid,
 last_error text
);
alter table public.cv_files enable row level security;
revoke all on public.cv_files from public, anon, authenticated;
grant all on public.cv_files to service_role;
create index cv_files_queue_idx on public.cv_files(next_attempt_at) where state in ('reserved','queued','deleting');
create index cv_files_org_idx on public.cv_files(organization_id,created_at);
create index cv_files_candidate_idx on public.cv_files(candidate_id);
create index candidates_retention_idx on public.candidates(retain_until) where retain_until is not null;
create index candidates_cursor_idx on public.candidates(organization_id,created_at desc,id desc);
create index candidates_cv_path_idx on public.candidates(cv_path) where cv_path is not null;
create index if not exists jobs_assigned_idx on public.jobs(assigned_to);
create index if not exists jobs_creator_idx on public.jobs(created_by);
create index if not exists candidates_creator_idx on public.candidates(created_by);
create table public.ai_runs (
 id uuid primary key default gen_random_uuid(),
 candidate_id uuid not null references public.candidates(id) on delete cascade,
 organization_id uuid not null references public.organizations(id) on delete cascade,
 created_at timestamptz not null default now()
);
alter table public.ai_runs enable row level security;
revoke all on public.ai_runs from public,anon,authenticated;
grant all on public.ai_runs to service_role;
create index ai_runs_org_idx on public.ai_runs(organization_id,created_at);
create index ai_runs_candidate_idx on public.ai_runs(candidate_id,created_at);

insert into public.cv_files(path,candidate_id,organization_id,state,size_bytes)
select distinct on (cv_path) cv_path,id,organization_id,'current',0
from public.candidates where cv_path is not null;
-- Recover older folder objects too, without deleting or renaming anything here.
insert into public.cv_files(path,candidate_id,organization_id,state,size_bytes,next_attempt_at)
select o.name,c.id,c.organization_id,'queued',0,now()+interval '24 hours'
from storage.objects o join public.candidates c
 on split_part(o.name,'/',1)=c.organization_id::text and split_part(o.name,'/',2)=c.id::text
where o.bucket_id='candidate-cvs' on conflict(path) do nothing;
update public.cv_files f set size_bytes=least(5242880,(to_jsonb(o)->'metadata'->>'size')::bigint)
from storage.objects o where o.bucket_id='candidate-cvs' and o.name=f.path
 and (to_jsonb(o)->'metadata'->>'size') ~ '^[0-9]{1,9}$';

-- Browser clients cannot bypass PDF validation, quotas or CAS by using Storage
-- directly. Only the authenticated server workflow uses service-role writes.
drop policy candidate_cvs_insert on storage.objects;
drop policy candidate_cvs_update on storage.objects;
drop policy candidate_cvs_delete on storage.objects;
drop policy candidate_cvs_select on storage.objects;
create policy candidate_cvs_select on storage.objects for select to authenticated using (
 bucket_id='candidate-cvs' and private.can_access_candidate_file(name)
 and exists(select 1 from public.candidates c where c.cv_path=objects.name)
);
revoke insert,update on public.candidates from authenticated;
grant insert(organization_id,job_id,created_by,full_name,email,phone,linkedin_url,current_title,current_company,notes,pipeline_stage,tags)
 on public.candidates to authenticated;
grant update(job_id,full_name,email,phone,linkedin_url,current_title,current_company,notes,pipeline_stage,tags,retain_until)
 on public.candidates to authenticated;
revoke insert,update on public.candidate_analyses from authenticated;

create function private.harden_candidate() returns trigger language plpgsql security definer set search_path='' as $$
begin
 if tg_op='INSERT' and auth.uid() is not null then new.created_by:=auth.uid(); end if;
 if tg_op='UPDATE' then
  if new.organization_id is distinct from old.organization_id then raise exception 'Candidates cannot move between workspaces'; end if;
  if new.retain_until is distinct from old.retain_until and auth.uid() is not null and not private.manages_org(old.organization_id) then
   raise exception 'Only managers can set retention';
  end if;
  if new.cv_path is distinct from old.cv_path and new.cv_path is not null and not exists(
   select 1 from public.cv_files f where f.path=new.cv_path and f.candidate_id=new.id and f.organization_id=new.organization_id and f.state='current'
  ) then raise exception 'CV must be committed through the verified upload workflow'; end if;
 end if;
 return new;
end; $$;
create trigger candidates_harden before insert or update on public.candidates for each row execute function private.harden_candidate();

create function private.cv_lifecycle() returns trigger language plpgsql security definer set search_path='' as $$
begin
 if tg_op='DELETE' then
  update public.cv_files set state='queued',next_attempt_at=case when state='reserved' then greatest(next_attempt_at,now()+interval '24 hours') else now() end
   where (candidate_id=old.id or path=old.cv_path) and state not in ('deleting','deleted')
    and not exists(select 1 from public.candidates c where c.cv_path=cv_files.path);
  -- Audit is pseudonymized rather than retaining a deleted candidate's name.
  update public.activity_log set entity_name='Deleted candidate',details='{}'::jsonb where entity_type='candidates' and entity_id=old.id;
 elsif new.cv_path is distinct from old.cv_path or new.job_id is distinct from old.job_id then
  update public.candidate_analyses set stale=true where candidate_id=new.id;
  if old.cv_path is not null and old.cv_path is distinct from new.cv_path then
   update public.cv_files set state='queued',next_attempt_at=now() where path=old.cv_path and state='current'
    and not exists(select 1 from public.candidates c where c.cv_path=old.cv_path);
  end if;
 end if;
 return coalesce(new,old);
end; $$;
-- z sorts after candidates_audit, including the deletion event itself.
create trigger z_candidates_cv_lifecycle after update or delete on public.candidates for each row execute function private.cv_lifecycle();
create function private.job_context_version() returns trigger language plpgsql security definer set search_path='' as $$
begin
 if (new.title,new.description,new.location,new.employment_type,new.salary_range,new.notes)
  is distinct from (old.title,old.description,old.location,old.employment_type,old.salary_range,old.notes) then
  new.context_version:=old.context_version+1;
  update public.candidate_analyses set stale=true where job_id=old.id or candidate_id in(select id from public.candidates where job_id=old.id);
 else new.context_version:=old.context_version;
 end if;
 return new;
end; $$;
create trigger jobs_context_version before update on public.jobs for each row execute function private.job_context_version();
create function private.guard_interview_identity() returns trigger language plpgsql security definer set search_path='' as $$
begin
 if (new.created_by,new.organization_id,new.candidate_id) is distinct from (old.created_by,old.organization_id,old.candidate_id) and auth.uid() is not null then
  raise exception 'Interview identity is immutable';
 end if;
 return new;
end; $$;
create trigger interviews_identity before update on public.interviews for each row execute function private.guard_interview_identity();

-- Do not copy candidate/interview names into new audit records. Older linked
-- interview labels are scrubbed before the FK cascade removes their linkage.
create or replace function private.audit_change() returns trigger language plpgsql security definer set search_path='' as $$
declare row_data jsonb; prior jsonb; oid uuid; jid uuid; label text; actor text;
begin
 row_data:=case when tg_op='DELETE' then to_jsonb(old) else to_jsonb(new) end;
 prior:=case when tg_op='UPDATE' then to_jsonb(old) else '{}'::jsonb end;
 oid:=case when tg_table_name='organizations' then (row_data->>'id')::uuid else (row_data->>'organization_id')::uuid end;
 jid:=case when tg_table_name='jobs' then (row_data->>'id')::uuid when tg_table_name='candidates' then (row_data->>'job_id')::uuid else null end;
 if tg_table_name in ('interviews','candidate_notes') then select job_id into jid from public.candidates where id=(row_data->>'candidate_id')::uuid; end if;
 label:=case when tg_table_name='candidates' then 'Candidate record' when tg_table_name='interviews' then 'Interview record' else coalesce(row_data->>'title',row_data->>'name',row_data->>'full_name',tg_table_name) end;
 select coalesce(nullif(full_name,''),email) into actor from public.profiles where id=auth.uid();
 insert into public.activity_log(organization_id,job_id,actor_id,actor_name,action,entity_type,entity_id,entity_name,details)
 values(oid,jid,auth.uid(),coalesce(actor,'System'),lower(tg_op),tg_table_name,(row_data->>'id')::uuid,label,
 jsonb_strip_nulls(jsonb_build_object('from_stage',prior->>'pipeline_stage','to_stage',row_data->>'pipeline_stage','status',row_data->>'status')));
 return coalesce(new,old);
end; $$;
create function private.prepare_candidate_erasure() returns trigger language plpgsql security definer set search_path='' as $$
begin
 update public.activity_log set entity_name='Deleted candidate data',details='{}'::jsonb
 where (entity_type='interviews' and entity_id in(select id from public.interviews where candidate_id=old.id))
 or (entity_type='candidate_notes' and entity_id in(select id from public.candidate_notes where candidate_id=old.id));
 return old;
end; $$;
revoke all on function private.prepare_candidate_erasure() from public,anon,authenticated;
create trigger candidates_prepare_erasure before delete on public.candidates for each row execute function private.prepare_candidate_erasure();
create function private.guard_job_tenant() returns trigger language plpgsql security definer set search_path='' as $$
begin
 if new.organization_id is distinct from old.organization_id then raise exception 'Jobs cannot move between workspaces'; end if;
 return new;
end; $$;
revoke all on function private.guard_job_tenant() from public,anon,authenticated;
create trigger jobs_tenant_guard before update on public.jobs for each row execute function private.guard_job_tenant();

-- Service-only RPCs. actor_id comes from verified getUser(), never from an
-- organization ID, form field, metadata, or a client-provided JWT decode.
create function private.use_actor(actor_id uuid) returns void language plpgsql security definer set search_path='' as $$
begin
 if actor_id is null or not exists(select 1 from public.profiles where id=actor_id and is_active) then raise exception 'Account unavailable'; end if;
 perform set_config('request.jwt.claim.sub',actor_id::text,true);
 perform set_config('request.jwt.claims',jsonb_build_object('sub',actor_id,'role','authenticated')::text,true);
end; $$;
create function public.reserve_cv(actor_id uuid,cid uuid,bytes bigint,digest text) returns jsonb language plpgsql security definer set search_path='' as $$
declare c public.candidates; oid uuid; rid uuid:=gen_random_uuid(); p text;
begin
 perform private.use_actor(actor_id);
 select organization_id into oid from public.candidates where id=cid;
 -- Serialize tenant quota accounting, then candidate request ordering.
 perform 1 from public.organizations where id=oid for update;
 select * into c from public.candidates where id=cid for update;
 if c.id is null or not private.can_access_candidate(cid) then raise exception 'Candidate unavailable'; end if;
 if bytes is null or bytes not between 1 and 5242880 or digest is null or digest !~ '^[a-f0-9]{64}$' then raise exception 'Invalid PDF'; end if;
 if (select count(*) from public.cv_files where organization_id=oid and created_at>now()-interval '1 hour')>=100
 or (select count(*) from public.cv_files where candidate_id=cid and created_at>now()-interval '1 hour')>=10
 or coalesce((select sum(size_bytes) from public.cv_files where organization_id=oid and state<>'deleted'),0)+bytes>1073741824 then
  raise exception 'CV upload quota reached. Retry later or contact your workspace administrator';
 end if;
 p:=oid::text||'/'||cid::text||'/'||rid::text||'.pdf';
 insert into public.cv_files(path,candidate_id,organization_id,request_id,state,size_bytes,sha256,next_attempt_at)
 values(p,cid,oid,rid,'reserved',bytes,digest,now()+interval '24 hours');
 update public.candidates set cv_request_id=rid where id=cid;
 return jsonb_build_object('path',p,'requestId',rid);
end; $$;
create function public.commit_cv(actor_id uuid,cid uuid,rid uuid,filename text) returns boolean language plpgsql security definer set search_path='' as $$
declare c public.candidates; f public.cv_files; jid uuid;
begin
 perform private.use_actor(actor_id);
 select job_id into jid from public.candidates where id=cid;
 perform 1 from public.jobs where id=jid for update;
 select * into c from public.candidates where id=cid for update;
 if c.id is null or not private.can_access_candidate(cid) then raise exception 'Candidate unavailable'; end if;
 select * into f from public.cv_files where request_id=rid and candidate_id=cid for update;
 if f.path is null or f.state<>'reserved' or c.cv_request_id is distinct from rid or f.next_attempt_at<=now() then return false; end if;
 if not exists(select 1 from storage.objects where bucket_id='candidate-cvs' and name=f.path) then raise exception 'Uploaded PDF not found'; end if;
 if filename is null or length(filename) not between 1 and 120 then raise exception 'Invalid filename'; end if;
 update public.cv_files set state='current' where path=f.path;
 update public.candidates set cv_path=f.path,cv_filename=filename,cv_uploaded_at=now(),analysis_request_id=null where id=cid;
 return true;
end; $$;
create function public.begin_analysis(actor_id uuid,cid uuid) returns jsonb language plpgsql security definer set search_path='' as $$
declare c public.candidates; j public.jobs; token uuid:=gen_random_uuid();
begin
 perform private.use_actor(actor_id);
 perform 1 from public.organizations where id=(select organization_id from public.candidates where id=cid) for update;
 select * into j from public.jobs where id=(select job_id from public.candidates where id=cid) for update;
 select * into c from public.candidates where id=cid for update;
 if c.id is null or c.cv_path is null or c.job_id<>j.id or not private.can_access_candidate(cid) then raise exception 'Candidate or CV unavailable'; end if;
 if (select count(*) from public.ai_runs where candidate_id=cid and created_at>now()-interval '1 hour')>=10
 or (select count(*) from public.ai_runs where organization_id=c.organization_id and created_at>now()-interval '1 hour')>=100 then
  raise exception 'AI retry quota reached';
 end if;
 insert into public.ai_runs(candidate_id,organization_id) values(cid,c.organization_id);
 update public.candidates set analysis_request_id=token where id=cid;
 return jsonb_build_object('token',token,'path',c.cv_path,'jobId',j.id,'version',j.context_version,'title',j.title,'description',j.description);
end; $$;
create function public.save_analysis(actor_id uuid,cid uuid,token uuid,expected_path text,expected_job uuid,expected_version bigint,payload jsonb,model_name text)
returns boolean language plpgsql security definer set search_path='' as $$
declare c public.candidates; version bigint;
begin
 perform private.use_actor(actor_id);
 select context_version into version from public.jobs where id=expected_job for update;
 select * into c from public.candidates where id=cid for update;
 if c.id is null or not private.can_access_candidate(cid) then raise exception 'Candidate unavailable'; end if;
 if c.cv_path is distinct from expected_path or c.job_id is distinct from expected_job or version is distinct from expected_version or c.analysis_request_id is distinct from token then return false; end if;
 if length(payload::text)>50000 or length(model_name)>100 or jsonb_typeof(payload)<>'object'
 or jsonb_typeof(payload->'summary') is distinct from 'string'
 or jsonb_typeof(payload->'strengths') is distinct from 'array'
 or jsonb_typeof(payload->'potential_gaps') is distinct from 'array'
 or jsonb_typeof(payload->'matching_skills') is distinct from 'array'
 or jsonb_typeof(payload->'interview_questions') is distinct from 'array' then raise exception 'Invalid analysis'; end if;
 insert into public.candidate_analyses(candidate_id,organization_id,summary,strengths,potential_gaps,matching_skills,interview_questions,model,disclaimer,cv_path,job_id,job_context_version,stale)
 values(cid,c.organization_id,payload->>'summary',payload->'strengths',payload->'potential_gaps',payload->'matching_skills',payload->'interview_questions',model_name,
 'AI-assisted summary only. Human verification required; this is not a hiring decision.',expected_path,expected_job,expected_version,false)
 on conflict(candidate_id) do update set summary=excluded.summary,strengths=excluded.strengths,potential_gaps=excluded.potential_gaps,
 matching_skills=excluded.matching_skills,interview_questions=excluded.interview_questions,model=excluded.model,disclaimer=excluded.disclaimer,
 cv_path=excluded.cv_path,job_id=excluded.job_id,job_context_version=excluded.job_context_version,stale=false;
 update public.candidates set analysis_request_id=null where id=cid;
 return true;
end; $$;

create function public.claim_cv_cleanup(batch_size integer default 25,target_org uuid default null) returns table(path text,lease_id uuid) language plpgsql security definer set search_path='' as $$
begin
 -- Recover late uploads after an expired/previously completed reservation.
 update public.cv_files f set state='queued',next_attempt_at=now() where state='deleted' and (target_org is null or organization_id=target_org)
  and exists(select 1 from storage.objects o where o.bucket_id='candidate-cvs' and o.name=f.path);
 delete from public.cv_files f where state='deleted' and next_attempt_at<now()-interval '7 days' and (target_org is null or organization_id=target_org);
 return query with pending as (
  select f.path from public.cv_files f where state in ('reserved','queued','deleting') and next_attempt_at<=now() and (target_org is null or organization_id=target_org)
   and not exists(select 1 from public.candidates c where c.cv_path=f.path)
  order by next_attempt_at limit least(greatest(batch_size,1),100) for update skip locked
 ) update public.cv_files f set state='deleting',lease_id=gen_random_uuid(),attempts=attempts+1,next_attempt_at=now()+interval '10 minutes'
 from pending p where f.path=p.path returning f.path,f.lease_id;
end; $$;
create function public.finish_cv_cleanup(object_path text,lease uuid,succeeded boolean) returns void language plpgsql security definer set search_path='' as $$
begin
 update public.cv_files set state=case when succeeded then 'deleted' else 'queued' end,
 next_attempt_at=now()+interval '10 minutes',last_error=case when succeeded then null else 'Storage removal failed; retry scheduled' end,lease_id=null
 where path=object_path and lease_id=lease and state='deleting';
end; $$;
create function public.purge_expired_candidates(batch_size integer default 100) returns integer language plpgsql security definer set search_path='' as $$
declare n integer;
begin
 delete from public.ai_runs where created_at<now()-interval '1 day';
 delete from public.candidates where id in(select id from public.candidates where retain_until<=now() order by retain_until limit least(greatest(batch_size,1),100) for update skip locked);
 get diagnostics n=row_count;
 return n;
end; $$;

-- Every function has a fixed empty search_path and explicit execution grants.
revoke all on function private.harden_candidate(),private.cv_lifecycle(),private.job_context_version(),private.guard_interview_identity(),private.use_actor(uuid) from public,anon,authenticated;
revoke all on function public.reserve_cv(uuid,uuid,bigint,text),public.commit_cv(uuid,uuid,uuid,text),public.begin_analysis(uuid,uuid),
 public.save_analysis(uuid,uuid,uuid,text,uuid,bigint,jsonb,text),public.claim_cv_cleanup(integer,uuid),public.finish_cv_cleanup(text,uuid,boolean),public.purge_expired_candidates(integer)
 from public,anon,authenticated;
grant execute on function public.reserve_cv(uuid,uuid,bigint,text),public.commit_cv(uuid,uuid,uuid,text),public.begin_analysis(uuid,uuid),
 public.save_analysis(uuid,uuid,uuid,text,uuid,bigint,jsonb,text),public.claim_cv_cleanup(integer,uuid),public.finish_cv_cleanup(text,uuid,boolean),public.purge_expired_candidates(integer)
 to service_role;

-- Parameter-bound literal search; caller RLS remains authoritative even for an
-- arbitrary organization filter. Offset depth is bounded; stable ID tie-break.
create function public.search_candidates(query_text text default '',org uuid default null,job uuid default null,stage text default null,sort_mode text default 'newest',page_number integer default 1)
returns jsonb language plpgsql security invoker set search_path='' as $$
declare result jsonb; term text;
begin
 if length(query_text)>160 or page_number not between 1 and 200 or sort_mode not in ('newest','oldest','name')
 or (stage is not null and stage not in ('new','screening','interview','offered','rejected')) then raise exception 'Invalid search'; end if;
 term:='%'||replace(replace(replace(query_text,'\','\\'),'%','\%'),'_','\_')||'%';
 with filtered as materialized (
  select c.*,jsonb_build_object('id',j.id,'title',j.title,'description',j.description,'status',j.status) as job
  from public.candidates c join public.jobs j on j.id=c.job_id
  where (org is null or c.organization_id=org) and (job is null or c.job_id=job) and (stage is null or c.pipeline_stage=stage)
   and (query_text='' or c.full_name ilike term or c.email ilike term or array_to_string(c.tags,' ') ilike term)
 ), paged as (
  select * from filtered order by
   case when sort_mode='name' then full_name end asc,
   case when sort_mode='oldest' then created_at end asc,
   case when sort_mode='newest' then created_at end desc,id desc
  limit 50 offset (page_number-1)*50
 ) select jsonb_build_object('candidates',coalesce((select jsonb_agg(to_jsonb(p)) from paged p),'[]'::jsonb),'total',(select count(*) from filtered)) into result;
 return result;
end; $$;
revoke all on function public.search_candidates(text,uuid,uuid,text,text,integer) from public,anon;
grant execute on function public.search_candidates(text,uuid,uuid,text,text,integer) to authenticated;
