-- Kinoo v2 · 0004 · Lo social, preparado pero sin pantallas (sección 14).

create table if not exists follows (
  follower_id uuid not null,
  followee_id uuid not null,
  created_at  timestamptz not null default now(),
  primary key (follower_id, followee_id),
  check (follower_id <> followee_id)
);

-- Mazos con dueño. owner_kind = system para los del equipo fundador ("Equipo Kinoo").
create table if not exists decks (
  id          uuid primary key default gen_random_uuid(),
  owner_kind  text not null check (owner_kind in ('system','curator','user')),
  owner_id    uuid,
  owner_name  text not null,
  title       text not null,
  visibility  text not null default 'private' check (visibility in ('private','followers','public')),
  created_at  timestamptz not null default now()
);

create table if not exists deck_items (
  deck_id    uuid not null references decks(id) on delete cascade,
  movie_id   text not null references movies(id),
  position   int not null,
  note       text,
  primary key (deck_id, movie_id)
);

create table if not exists lists (
  id          uuid primary key default gen_random_uuid(),
  owner_id    uuid not null,
  title       text not null,
  is_public   boolean not null default false,
  movie_ids   text[] not null default '{}',
  created_at  timestamptz not null default now()
);

create table if not exists groups (
  id         uuid primary key default gen_random_uuid(),
  name       text not null,
  created_by uuid not null,
  created_at timestamptz not null default now()
);

create table if not exists group_members (
  group_id  uuid not null references groups(id) on delete cascade,
  user_id   uuid not null,
  role      text not null default 'member' check (role in ('owner','member')),
  joined_at timestamptz not null default now(),
  primary key (group_id, user_id)
);
