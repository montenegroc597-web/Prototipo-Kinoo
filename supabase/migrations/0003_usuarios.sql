-- Kinoo v2 · 0003 · Datos de cada persona. Los eventos son la fuente de verdad; lo demás se deriva.

create table if not exists profiles (
  user_id       uuid primary key,
  username      text unique,
  display_name  text,
  tarot_card    text references tarot_archetypes(key),
  is_public     boolean not null default false,
  country       text not null default 'CO',
  providers     text[] not null default '{}',
  created_at    timestamptz not null default now()
);

-- Ley 1581 de 2012: qué aceptó cada persona y cuándo.
create table if not exists consents (
  id             bigint generated always as identity primary key,
  user_id        uuid not null,
  purpose        text not null,
  policy_version text not null,
  granted        boolean not null,
  created_at     timestamptz not null default now()
);

-- Registro de eventos: solo se agrega. Nunca se edita ni se borra (salvo la función de borrado por petición).
create table if not exists events (
  id         uuid primary key,
  user_id    uuid not null,
  type       text not null check (type in ('onboarding_choice','deck_opened','card_flipped','saved_intent','dismissed','marked_seen','rewatch_intent','deck_completed','watch_proposed','watch_skipped','watch_started','watch_confirmed','attribute_refuted','undo','platforms_set')),
  movie_id   text references movies(id),
  at         timestamptz not null default now(),
  context    jsonb not null default '{}'::jsonb,
  payload    jsonb not null default '{}'::jsonb,
  received_at timestamptz not null default now()
);
create index if not exists events_user_at_idx on events (user_id, at);

create or replace function kinoo_events_append_only() returns trigger language plpgsql as $$
begin
  if current_setting('kinoo.allow_event_delete', true) = 'on' and tg_op = 'DELETE' then
    return old;
  end if;
  raise exception 'events es solo de agregar: % no permitido', tg_op;
end $$;

drop trigger if exists events_append_only on events;
create trigger events_append_only before update or delete on events
  for each row execute function kinoo_events_append_only();

-- Perfil global (cálculo desde events; se puede recalcular).
create table if not exists user_taste_profiles (
  user_id        uuid primary key,
  vector         jsonb not null check (kinoo_valid_atoms(vector, -1, 1)),
  signal_count   int not null default 0,
  formula_version text not null default 'v2',
  updated_at     timestamptz not null default now()
);

-- Receta personal de cada mood (copia de la semilla que se ajusta con lo que la persona hace en ese mood).
create table if not exists user_vibe_recipes (
  user_id      uuid not null,
  vibe         text not null references vibes(key),
  recipe       jsonb not null check (kinoo_valid_atoms(recipe, -1, 1)),
  seed_version int not null,
  signal_count int not null default 0,
  updated_at   timestamptz not null default now(),
  primary key (user_id, vibe)
);

-- Marca actual por película (vista de trabajo derivada de events).
create table if not exists user_movie_state (
  user_id        uuid not null,
  movie_id       text not null references movies(id),
  state          text not null check (state in ('saved','seen','rewatch','dismissed')),
  special_match  boolean not null default false,
  saved_at       timestamptz,
  updated_at     timestamptz not null default now(),
  primary key (user_id, movie_id)
);

-- Mazo abierto en Descubrir (para que GET /deck/current devuelva el mismo).
create table if not exists active_decks (
  deck_id       uuid primary key,
  user_id       uuid not null,
  vibe          text references vibes(key),
  size          int not null,
  cards         jsonb not null,
  profile_before jsonb not null,
  special_used  boolean not null default false,
  opened_at     timestamptz not null default now(),
  completed_at  timestamptz
);
create index if not exists active_decks_user_idx on active_decks (user_id, opened_at desc);
