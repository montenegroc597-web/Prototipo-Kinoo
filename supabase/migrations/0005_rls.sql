-- Kinoo v2 · 0005 · Seguridad por fila. Cada persona lee y escribe lo suyo; el catálogo y la configuración son de lectura pública.
-- auth.uid() lo da Supabase. Las Edge Functions con service_role se saltan RLS.

-- Lectura pública: configuración y catálogo.
do $$
declare t text;
begin
  foreach t in array array['atoms','vibes','archetypes','action_weights','deck_recipes','explanation_templates','config','movies','catalog_atom_stats'] loop
    execute format('alter table %I enable row level security', t);
    execute format('drop policy if exists %I on %I', t || '_read', t);
    execute format('create policy %I on %I for select using (true)', t || '_read', t);
  end loop;
end $$;

-- Tablas de cada persona: solo su user_id.
do $$
declare t text;
begin
  foreach t in array array['consents','user_taste_profiles','user_vibe_recipes','user_movie_state','active_decks'] loop
    execute format('alter table %I enable row level security', t);
    execute format('drop policy if exists %I on %I', t || '_own', t);
    execute format('create policy %I on %I for all using (user_id = auth.uid()) with check (user_id = auth.uid())', t || '_own', t);
  end loop;
end $$;

-- events: leer lo propio, agregar lo propio. Sin update ni delete (además lo impide el trigger).
alter table events enable row level security;
drop policy if exists events_read_own on events;
create policy events_read_own on events for select using (user_id = auth.uid());
drop policy if exists events_insert_own on events;
create policy events_insert_own on events for insert with check (user_id = auth.uid());

-- Votos de la comunidad: cada quien escribe los suyos; todos pueden leer el agregado (la vista).
alter table movie_atom_votes enable row level security;
drop policy if exists votes_own on movie_atom_votes;
create policy votes_own on movie_atom_votes for all using (user_id = auth.uid()) with check (user_id = auth.uid());

-- Perfiles: lo propio siempre; los públicos los lee cualquiera.
alter table profiles enable row level security;
drop policy if exists profiles_read on profiles;
create policy profiles_read on profiles for select using (is_public or user_id = auth.uid());
drop policy if exists profiles_write on profiles;
create policy profiles_write on profiles for all using (user_id = auth.uid()) with check (user_id = auth.uid());

alter table follows enable row level security;
drop policy if exists follows_read on follows;
create policy follows_read on follows for select using (follower_id = auth.uid() or followee_id = auth.uid());
drop policy if exists follows_write on follows;
create policy follows_write on follows for all using (follower_id = auth.uid()) with check (follower_id = auth.uid());

alter table decks enable row level security;
drop policy if exists decks_read on decks;
create policy decks_read on decks for select using (
  owner_kind = 'system' or visibility = 'public' or owner_id = auth.uid()
  or (visibility = 'followers' and exists (select 1 from follows f where f.follower_id = auth.uid() and f.followee_id = decks.owner_id)));
drop policy if exists decks_write on decks;
create policy decks_write on decks for all using (owner_kind <> 'system' and owner_id = auth.uid()) with check (owner_kind <> 'system' and owner_id = auth.uid());

alter table deck_items enable row level security;
drop policy if exists deck_items_read on deck_items;
create policy deck_items_read on deck_items for select using (exists (select 1 from decks d where d.id = deck_items.deck_id));
drop policy if exists deck_items_write on deck_items;
create policy deck_items_write on deck_items for all
  using (exists (select 1 from decks d where d.id = deck_items.deck_id and d.owner_kind <> 'system' and d.owner_id = auth.uid()))
  with check (exists (select 1 from decks d where d.id = deck_items.deck_id and d.owner_kind <> 'system' and d.owner_id = auth.uid()));

alter table lists enable row level security;
drop policy if exists lists_read on lists;
create policy lists_read on lists for select using (is_public or owner_id = auth.uid());
drop policy if exists lists_write on lists;
create policy lists_write on lists for all using (owner_id = auth.uid()) with check (owner_id = auth.uid());

alter table groups enable row level security;
drop policy if exists groups_read on groups;
create policy groups_read on groups for select using (created_by = auth.uid() or exists (select 1 from group_members m where m.group_id = groups.id and m.user_id = auth.uid()));
drop policy if exists groups_write on groups;
create policy groups_write on groups for all using (created_by = auth.uid()) with check (created_by = auth.uid());

alter table group_members enable row level security;
drop policy if exists group_members_read on group_members;
create policy group_members_read on group_members for select using (user_id = auth.uid() or exists (select 1 from groups g where g.id = group_members.group_id and g.created_by = auth.uid()));
drop policy if exists group_members_write on group_members;
create policy group_members_write on group_members for all
  using (exists (select 1 from groups g where g.id = group_members.group_id and g.created_by = auth.uid()))
  with check (exists (select 1 from groups g where g.id = group_members.group_id and g.created_by = auth.uid()));

grant usage on schema public to anon, authenticated;
grant select on all tables in schema public to anon, authenticated;
grant insert, update, delete on consents, user_taste_profiles, user_vibe_recipes, user_movie_state, active_decks,
  movie_atom_votes, profiles, follows, decks, deck_items, lists, groups, group_members to authenticated;
grant insert on events to authenticated;
