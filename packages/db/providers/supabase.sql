-- Proveedor: Supabase. Los roles anon, authenticated y service_role y la función auth.uid() ya existen.
-- La persona actual es la del JWT de Supabase Auth.
create or replace function kinoo_current_user() returns uuid language sql stable as $$
  select auth.uid()
$$;
grant execute on function kinoo_current_user() to anon, authenticated, service_role;
