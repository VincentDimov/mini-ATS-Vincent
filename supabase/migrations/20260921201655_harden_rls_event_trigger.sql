-- Keep Supabase's RLS auto-enable event trigger intact, while preventing any
-- direct PostgREST/RPC invocation of its SECURITY DEFINER implementation.
revoke execute on function public.rls_auto_enable() from public, anon, authenticated;
