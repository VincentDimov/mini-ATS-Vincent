-- Run in a disposable database only. No fixture survives this transaction.
begin;
insert into auth.users(id,email) values('a1000000-0000-4000-8000-000000000001','hardening@example.test'),('a1000000-0000-4000-8000-000000000002','other@example.test');
insert into public.organizations(id,name) values('a2000000-0000-4000-8000-000000000001','Hardening A'),('a2000000-0000-4000-8000-000000000002','Hardening B');
insert into public.profiles(id,email,role,organization_id,is_org_manager) values
 ('a1000000-0000-4000-8000-000000000001','hardening@example.test','customer','a2000000-0000-4000-8000-000000000001',true),
 ('a1000000-0000-4000-8000-000000000002','other@example.test','customer','a2000000-0000-4000-8000-000000000002',false);
insert into public.jobs(id,organization_id,title,description) values('a3000000-0000-4000-8000-000000000001','a2000000-0000-4000-8000-000000000001','Test job','Test description');
insert into public.candidates(id,organization_id,job_id,full_name,email) values('a4000000-0000-4000-8000-000000000001','a2000000-0000-4000-8000-000000000001','a3000000-0000-4000-8000-000000000001','Synthetic Candidate','fake@example.test');
set local role authenticated;
select set_config('request.jwt.claim.sub','a1000000-0000-4000-8000-000000000001',true);
do $$ begin
 begin perform public.reserve_cv(auth.uid(),'a4000000-0000-4000-8000-000000000001',100,repeat('a',64)); raise exception 'Service RPC exposed'; exception when insufficient_privilege then null; end;
 begin update public.candidates set cv_path='forged'; raise exception 'CV CAS bypassed'; exception when insufficient_privilege then null; end;
 if (public.search_candidates('Synthetic',null,null,null,'newest',1)->>'total')::int<>1 then raise exception 'Search failed'; end if;
 if (public.search_candidates('%',null,null,null,'newest',1)->>'total')::int<>0 then raise exception 'Search wildcard was not literal'; end if;
end $$;
reset role;
do $$ declare old_upload jsonb; newest jsonb; ctx jsonb; newer_ctx jsonb; claim record; payload jsonb:='{"summary":"Synthetic","strengths":[],"potential_gaps":[],"matching_skills":[],"interview_questions":[]}'; begin
 begin
  perform public.reserve_cv('a1000000-0000-4000-8000-000000000002','a4000000-0000-4000-8000-000000000001',100,repeat('a',64));
  raise exception 'Cross tenant reservation allowed';
 exception when raise_exception then if sqlerrm<>'Candidate unavailable' then raise; end if; end;
 old_upload:=public.reserve_cv('a1000000-0000-4000-8000-000000000001','a4000000-0000-4000-8000-000000000001',100,repeat('a',64));
 newest:=public.reserve_cv('a1000000-0000-4000-8000-000000000001','a4000000-0000-4000-8000-000000000001',100,repeat('b',64));
 insert into storage.objects(bucket_id,name) values('candidate-cvs',old_upload->>'path'),('candidate-cvs',newest->>'path');
 if public.commit_cv('a1000000-0000-4000-8000-000000000001','a4000000-0000-4000-8000-000000000001',(old_upload->>'requestId')::uuid,'old.pdf') then raise exception 'Older upload won'; end if;
 if not public.commit_cv('a1000000-0000-4000-8000-000000000001','a4000000-0000-4000-8000-000000000001',(newest->>'requestId')::uuid,'new.pdf') then raise exception 'Newest upload failed'; end if;
 ctx:=public.begin_analysis('a1000000-0000-4000-8000-000000000001','a4000000-0000-4000-8000-000000000001');
 newer_ctx:=public.begin_analysis('a1000000-0000-4000-8000-000000000001','a4000000-0000-4000-8000-000000000001');
 if public.save_analysis('a1000000-0000-4000-8000-000000000001','a4000000-0000-4000-8000-000000000001',(ctx->>'token')::uuid,ctx->>'path',(ctx->>'jobId')::uuid,(ctx->>'version')::bigint,payload,'test') then raise exception 'Older AI run won'; end if;
 if not public.save_analysis('a1000000-0000-4000-8000-000000000001','a4000000-0000-4000-8000-000000000001',(newer_ctx->>'token')::uuid,newer_ctx->>'path',(newer_ctx->>'jobId')::uuid,(newer_ctx->>'version')::bigint,payload,'test') then raise exception 'Current AI rejected'; end if;
 ctx:=public.begin_analysis('a1000000-0000-4000-8000-000000000001','a4000000-0000-4000-8000-000000000001');
 update public.jobs set description='Changed' where id='a3000000-0000-4000-8000-000000000001';
 if not(select stale from public.candidate_analyses where candidate_id='a4000000-0000-4000-8000-000000000001') then raise exception 'Job change did not invalidate analysis'; end if;
 if public.save_analysis('a1000000-0000-4000-8000-000000000001','a4000000-0000-4000-8000-000000000001',(ctx->>'token')::uuid,ctx->>'path',(ctx->>'jobId')::uuid,(ctx->>'version')::bigint,payload,'test') then raise exception 'Outdated job result accepted'; end if;
 -- Force abandoned reservation expiry, never the referenced current CV.
 update public.cv_files set next_attempt_at=now()-interval '1 hour';
 for claim in select * from public.claim_cv_cleanup(25) loop
  if claim.path=newest->>'path' then raise exception 'Referenced CV claimed'; end if;
  perform public.finish_cv_cleanup(claim.path,claim.lease_id,false);
 end loop;
 if not exists(select 1 from public.cv_files where path=old_upload->>'path' and state='queued' and last_error is not null) then raise exception 'Cleanup failure lost'; end if;
 update public.candidates set retain_until=now()-interval '1 day' where id='a4000000-0000-4000-8000-000000000001';
 if public.purge_expired_candidates(100)<>1 then raise exception 'Retention purge failed'; end if;
 if exists(select 1 from public.candidate_analyses where candidate_id='a4000000-0000-4000-8000-000000000001') then raise exception 'Analysis survived deletion'; end if;
 if exists(select 1 from public.activity_log where entity_name='Synthetic Candidate') then raise exception 'Deleted candidate name retained in audit'; end if;
 if not exists(select 1 from public.cv_files where path=newest->>'path' and state='queued') then raise exception 'Candidate deletion failed to queue CV'; end if;
end $$;
set local role authenticated;
select set_config('request.jwt.claim.sub','a1000000-0000-4000-8000-000000000002',true);
do $$ begin
 if (public.search_candidates('',null,null,null,'newest',1)->>'total')::int<>0 then raise exception 'Cross tenant search leaked'; end if;
 begin select count(*) from public.cv_files; raise exception 'Registry exposed'; exception when insufficient_privilege then null; end;
end $$;
reset role;
rollback;
