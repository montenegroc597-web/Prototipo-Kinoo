-- Kinoo v2 · 0001 · Configuración del algoritmo (todo lo ajustable vive en tablas, no en código).
-- Fuente editable: data/config/*.json. La semilla (supabase/seed/) se genera con `npm run seed`.

create extension if not exists vector;

create table if not exists atoms (
  key          text primary key,
  dimension    text not null check (dimension in ('dinamica','atmosfera','estetica','carga')),
  label        text not null,
  description  text not null,
  sort_order   int  not null
);

create table if not exists vibes (
  key               text primary key,
  name              text not null,
  definition        text not null,
  aliases           text[] not null default '{}',
  recipe            jsonb not null default '{}'::jsonb,
  quality_weight    real,
  example_movie_ids text[] not null default '{}',
  active            boolean not null default true,
  version           int not null default 1,
  updated_at        timestamptz not null default now()
);

create table if not exists tarot_archetypes (
  key    text primary key,
  name   text not null,
  recipe jsonb not null
);

create table if not exists action_weights (
  action  text not null,
  variant text not null default 'default',
  signal  real not null check (signal between -2 and 2),
  eta     real not null check (eta between 0 and 1),
  reason  text,
  primary key (action, variant)
);

create table if not exists deck_recipes (
  size       int primary key check (size > 0),
  is_default boolean not null default false,
  slots      jsonb not null
);

create table if not exists explanation_templates (
  key  text primary key,
  text text not null check (text !~ '[0-9%]')
);

-- Parámetros sueltos (umbrales, β, γ…): una fila por parámetro.
create table if not exists config (
  key        text primary key,
  value      jsonb not null,
  updated_at timestamptz not null default now()
);
