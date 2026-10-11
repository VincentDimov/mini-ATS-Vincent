-- Keep Supabase's RLS auto-enable event trigger intact, while preventing any
-- direct PostgREST/RPC invocation of its SECURITY DEFINER implementation.
do $$
begin
  if to_regprocedure('public.rls_auto_enable()') is not null then
    revoke execute on function public.rls_auto_enable() from public, anon, authenticated;
  end if;
end;
$$;
