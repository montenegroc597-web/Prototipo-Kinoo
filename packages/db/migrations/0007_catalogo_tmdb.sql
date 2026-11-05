-- Kinoo v2 · 0007 · Catálogo con datos de TMDB: id de IMDb, palabras clave y la fuente "tmdb_simulado" (fixtures sin red).

alter table movies add column if not exists imdb_id text;
alter table movies add column if not exists keywords text[] not null default '{}';
create unique index if not exists movies_imdb_id_idx on movies (imdb_id) where imdb_id is not null;

alter table movies drop constraint if exists movies_source_check;
alter table movies add constraint movies_source_check check (source in ('tmdb', 'tmdb_simulado', 'semilla_manual'));
