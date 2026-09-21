-- The service role is used only by server-side provisioning code.  It bypasses
-- RLS, but still needs explicit PostgreSQL object privileges after the least-
-- privilege grants in the base migration.
grant usage on schema public to service_role;

grant select, insert, update, delete on table
  public.organizations,
  public.profiles,
  public.jobs,
  public.candidates,
  public.candidate_analyses
to service_role;
