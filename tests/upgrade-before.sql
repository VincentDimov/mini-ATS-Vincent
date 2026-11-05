-- Synthetic legacy records; only loaded by the disposable migration test.
insert into public.organizations(id,name) values('b2000000-0000-4000-8000-000000000001','Migration preservation fixture');
insert into public.jobs(id,organization_id,title,description) values('b3000000-0000-4000-8000-000000000001','b2000000-0000-4000-8000-000000000001','Existing job','Existing context');
insert into public.candidates(id,organization_id,job_id,full_name,email,cv_path,cv_filename) values('b4000000-0000-4000-8000-000000000001','b2000000-0000-4000-8000-000000000001','b3000000-0000-4000-8000-000000000001','Existing Synthetic Candidate','legacy@example.test','b2000000-0000-4000-8000-000000000001/b4000000-0000-4000-8000-000000000001/legacy.pdf','legacy.pdf');
insert into public.candidate_analyses(candidate_id,organization_id,summary,model,disclaimer) values('b4000000-0000-4000-8000-000000000001','b2000000-0000-4000-8000-000000000001','Preserve legacy summary','legacy-test','Synthetic only');
insert into storage.objects(bucket_id,name) values('candidate-cvs','b2000000-0000-4000-8000-000000000001/b4000000-0000-4000-8000-000000000001/legacy.pdf');
