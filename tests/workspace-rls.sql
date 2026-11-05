-- Run only on an isolated database after all migrations. Every fixture is rolled back.
begin;
insert into auth.users(id,email) values
 ('10000000-0000-4000-8000-000000000001','admin@example.test'),
 ('10000000-0000-4000-8000-000000000002','manager@example.test'),
 ('10000000-0000-4000-8000-000000000003','member@example.test'),
 ('10000000-0000-4000-8000-000000000004','other@example.test');
insert into public.organizations(id,name) values
 ('20000000-0000-4000-8000-000000000001','Test workspace A'),
 ('20000000-0000-4000-8000-000000000002','Test workspace B');
insert into public.profiles(id,email,full_name,role,organization_id,is_org_manager) values
 ('10000000-0000-4000-8000-000000000001','admin@example.test','Admin','admin',null,false),
 ('10000000-0000-4000-8000-000000000002','manager@example.test','Manager','customer','20000000-0000-4000-8000-000000000001',true),
 ('10000000-0000-4000-8000-000000000003','member@example.test','Member','customer','20000000-0000-4000-8000-000000000001',false),
 ('10000000-0000-4000-8000-000000000004','other@example.test','Other','customer','20000000-0000-4000-8000-000000000002',false);
insert into public.jobs(id,organization_id,title,description,restricted) values
 ('30000000-0000-4000-8000-000000000001','20000000-0000-4000-8000-000000000001','Shared role','Test',false),
 ('30000000-0000-4000-8000-000000000002','20000000-0000-4000-8000-000000000001','Restricted role','Test',true),
 ('30000000-0000-4000-8000-000000000003','20000000-0000-4000-8000-000000000002','Other role','Test',false);
insert into public.candidates(id,organization_id,job_id,full_name,email) values
 ('40000000-0000-4000-8000-000000000001','20000000-0000-4000-8000-000000000001','30000000-0000-4000-8000-000000000002','Test Candidate','candidate@example.test');
insert into public.job_groups(id,organization_id,name) values('50000000-0000-4000-8000-000000000001','20000000-0000-4000-8000-000000000001','Test circle');
set local role authenticated;
select set_config('request.jwt.claim.sub','10000000-0000-4000-8000-000000000003',true);
do $$ declare inserted_id uuid; begin
 if (select count(*) from public.jobs)<>1 then raise exception 'Member must see only shared roles'; end if;
 insert into public.jobs(organization_id,title,description) values('20000000-0000-4000-8000-000000000001','Returning regression','Local test') returning id into inserted_id;
 if inserted_id is null then raise exception 'INSERT RETURNING could not see created job'; end if;
 delete from public.jobs where id=inserted_id;
 if (select count(*) from public.candidates)<>0 then raise exception 'Restricted candidate leaked'; end if;
 if private.can_access_candidate_file('20000000-0000-4000-8000-000000000001/40000000-0000-4000-8000-000000000001/test.pdf') then raise exception 'Restricted CV leaked'; end if;
 if (select count(*) from public.profiles)<>2 then raise exception 'Team profile isolation failed'; end if;
 update public.profiles set is_org_manager=true where id=auth.uid();
 if(select is_org_manager from public.profiles where id=auth.uid()) then raise exception 'Member could escalate privileges'; end if;
 begin
  insert into public.activity_log(actor_name,action,entity_type,entity_id,entity_name) values('Spoof','insert','jobs',gen_random_uuid(),'Fake');
  raise exception 'Audit event could be forged';
 exception when insufficient_privilege then null; end;
end $$;
reset role;
insert into public.group_members(organization_id,group_id,profile_id) values('20000000-0000-4000-8000-000000000001','50000000-0000-4000-8000-000000000001','10000000-0000-4000-8000-000000000003');
insert into public.group_jobs(organization_id,group_id,job_id) values('20000000-0000-4000-8000-000000000001','50000000-0000-4000-8000-000000000001','30000000-0000-4000-8000-000000000002');
set local role authenticated;
do $$ begin
 if(select count(*) from public.jobs)<>2 then raise exception 'Group access was not granted'; end if;
 if(select count(*) from public.candidates)<>1 then raise exception 'Candidate group access missing'; end if;
 if not private.can_access_candidate_file('20000000-0000-4000-8000-000000000001/40000000-0000-4000-8000-000000000001/test.pdf') then raise exception 'Two-folder CV access broken'; end if;
 if private.can_access_candidate_file('20000000-0000-4000-8000-000000000002/40000000-0000-4000-8000-000000000001/test.pdf') then raise exception 'Forged CV organization accepted'; end if;
 begin
  perform public.move_candidates(array['40000000-0000-4000-8000-000000000001'::uuid,'40000000-0000-4000-8000-000000000099'::uuid],'interview');
  raise exception 'Partially available bulk update succeeded';
 exception when raise_exception then if sqlerrm='Partially available bulk update succeeded' then raise; end if; end;
 if(select pipeline_stage from public.candidates where id='40000000-0000-4000-8000-000000000001')<>'new' then raise exception 'Bulk update was not atomic'; end if;
 if public.move_candidates(array['40000000-0000-4000-8000-000000000001'::uuid],'screening')<>1 then raise exception 'Bulk update failed'; end if;
 insert into public.candidate_notes(organization_id,candidate_id,author_id,body) values('20000000-0000-4000-8000-000000000001','40000000-0000-4000-8000-000000000001',auth.uid(),'A real test note');
 begin
  insert into public.candidate_notes(organization_id,candidate_id,author_id,body) values('20000000-0000-4000-8000-000000000001','40000000-0000-4000-8000-000000000001','10000000-0000-4000-8000-000000000002','Spoofed note');
  raise exception 'Note author could be forged';
 exception when insufficient_privilege then null; end;
 begin
  update public.jobs set restricted=false where id='30000000-0000-4000-8000-000000000002';
  raise exception 'Member could change access rules';
 exception when raise_exception then if sqlerrm='Member could change access rules' then raise; end if; end;
end $$;
select set_config('request.jwt.claim.sub','10000000-0000-4000-8000-000000000004',true);
do $$ begin
 if(select count(*) from public.candidates)<>0 or (select count(*) from public.candidate_notes)<>0 then raise exception 'Cross-tenant records leaked'; end if;
 if(select count(*) from public.jobs)<>1 then raise exception 'Tenant isolation failed'; end if;
end $$;
reset role;
select set_config('request.jwt.claim.sub','',true);
update public.profiles set is_active=false where id='10000000-0000-4000-8000-000000000003';
set local role authenticated;
select set_config('request.jwt.claim.sub','10000000-0000-4000-8000-000000000003',true);
do $$ begin if(select count(*) from public.jobs)<>0 then raise exception 'Suspended member retains access'; end if; end $$;
select set_config('request.jwt.claim.sub','10000000-0000-4000-8000-000000000001',true);
do $$ begin
 if(select count(*) from public.jobs)<>3 then raise exception 'Admin access failed'; end if;
 if not exists(select 1 from public.activity_log where actor_id='10000000-0000-4000-8000-000000000003' and entity_type='candidate_notes') then raise exception 'Audit actor missing'; end if;
end $$;
rollback;
select 'PASS: tenant isolation, group access, privilege guards, note authors, immutable audit and suspended accounts' as result;
