-- Kinoo v2 · 0002 · Catálogo: películas con su ADN y votos de la comunidad.

-- Verifica que un jsonb de átomos tenga solo claves conocidas y valores entre lo y hi.
create or replace function kinoo_valid_atoms(v jsonb, lo real, hi real) returns boolean
language sql immutable as $$
  select coalesce(bool_and(
           e.key in ('frenetica','agil','pausada','contemplativa','reconfortante','luminosa','melancolica','tensa','inquietante','sombria','cruda','onirica','neon','pastel','calida','monocromatica','carga_emocional','complejidad','humor','intimidad','escala_epica')
           and jsonb_typeof(e.value) = 'number'
           and (e.value)::text::real between lo and hi), true)
  from jsonb_each(v) e
$$;

create table if not exists movies (
  id                text primary key,
  tmdb_id           int unique,
  title             text not null,
  original_title    text,
  year              int,
  runtime_min       int,
  genres            text[] not null default '{}',
  directors         text[] not null default '{}',
  countries         text[] not null default '{}',
  original_language text,
  vote_average      real,
  vote_count        int,
  popularity        real,
  poster_path       text,
  overview          text,
  -- ADN según el juez sintético (LLM). Nunca se sobrescribe con votos: ver movie_atom_votes.
  atoms             jsonb not null check (kinoo_valid_atoms(atoms, 0, 1)),
  hook              text not null check (char_length(hook) <= 160),
  pillars           jsonb not null default '{}'::jsonb,
  -- {"CO": ["Netflix","Max"], ...} solo suscripción
  providers         jsonb not null default '{}'::jsonb,
  tagger_model      text not null,
  prompt_version    text not null,
  tagged_at         timestamptz not null,
  source            text not null default 'tmdb' check (source in ('tmdb','semilla_manual')),
  -- Embeddings para búsqueda libre: fuera del piloto, la columna queda creada.
  embedding         vector(1536),
  created_at        timestamptz not null default now()
);

create index if not exists movies_providers_idx on movies using gin (providers);

-- Promedio de cada átomo en el catálogo (μᵢ del rasgo distintivo). Se recalcula cuando cambia el catálogo.
create table if not exists catalog_atom_stats (
  atom        text primary key references atoms(key),
  mean        real not null,
  stddev      real not null,
  computed_at timestamptz not null default now()
);

-- Votos de la comunidad: "este rasgo no corresponde". value es el valor que la persona cree correcto (0–1).
create table if not exists movie_atom_votes (
  id         bigint generated always as identity primary key,
  movie_id   text not null references movies(id) on delete cascade,
  atom       text not null references atoms(key),
  user_id    uuid not null,
  value      real not null check (value between 0 and 1),
  created_at timestamptz not null default now(),
  unique (movie_id, atom, user_id)
);

-- Valor efectivo (sección 13): (k·M_LLM + Σ votos) / (k + n).
create or replace view movie_effective_atoms as
select m.id as movie_id, a.key as atom,
       ((k.v * (m.atoms ->> a.key)::real) + coalesce(sum(v.value), 0)) / (k.v + count(v.id)) as value,
       count(v.id) as votes
from movies m
cross join atoms a
cross join (select coalesce((select (value)::text::real from config where key = 'community_prior_weight'), 10) as v) k
left join movie_atom_votes v on v.movie_id = m.id and v.atom = a.key
group by m.id, a.key, m.atoms, k.v;
