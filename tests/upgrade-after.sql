do $$ begin
 if not exists(select 1 from public.candidates where id='b4000000-0000-4000-8000-000000000001' and full_name='Existing Synthetic Candidate' and cv_filename='legacy.pdf') then raise exception 'Existing candidate data changed'; end if;
 if not exists(select 1 from public.candidate_analyses where candidate_id='b4000000-0000-4000-8000-000000000001' and summary='Preserve legacy summary' and stale) then raise exception 'Legacy analysis was lost or incorrectly certified current'; end if;
 if not exists(select 1 from public.cv_files where candidate_id='b4000000-0000-4000-8000-000000000001' and state='current') then raise exception 'Legacy CV was not registered'; end if;
 if not exists(select 1 from storage.objects where name='b2000000-0000-4000-8000-000000000001/b4000000-0000-4000-8000-000000000001/legacy.pdf') then raise exception 'Migration deleted a legacy CV'; end if;
end $$;
delete from public.organizations where id='b2000000-0000-4000-8000-000000000001';
delete from storage.objects where name='b2000000-0000-4000-8000-000000000001/b4000000-0000-4000-8000-000000000001/legacy.pdf';
delete from public.cv_files where candidate_id='b4000000-0000-4000-8000-000000000001';
