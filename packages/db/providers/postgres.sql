-- Proveedor: PostgreSQL genérico (Docker, Neon, AWS RDS, Google Cloud SQL, Azure…).
-- Se aplica ANTES de las migraciones. Crea los roles que usan las reglas de seguridad y define quién es la persona actual.
-- El servidor de la API abre una transacción por petición y hace:
--   set local role authenticated;  select set_config('app.user_id', '<uuid>', true);
do $$ begin
  if not exists (select 1 from pg_roles where rolname = 'anon') then create role anon nologin; end if;
  if not exists (select 1 from pg_roles where rolname = 'authenticated') then create role authenticated nologin; end if;
  if not exists (select 1 from pg_roles where rolname = 'service_role') then create role service_role nologin bypassrls; end if;
end $$;

create or replace function kinoo_current_user() returns uuid language sql stable as $$
  select nullif(current_setting('app.user_id', true), '')::uuid
$$;
grant execute on function kinoo_current_user() to anon, authenticated, service_role;
