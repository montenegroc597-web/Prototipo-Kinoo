-- Kinoo v2 · 0006 · Ley 1581: exportar y borrar los datos de una persona.
-- Las llama la propia persona (auth.uid()); no reciben un user_id para que nadie pida los datos de otra.

create or replace function kinoo_export_my_data() returns jsonb
language plpgsql security definer set search_path = public as $$
declare uid uuid := auth.uid();
begin
  if uid is null then raise exception 'sin sesión'; end if;
  return jsonb_build_object(
    'profile', (select to_jsonb(p) from profiles p where p.user_id = uid),
    'consents', coalesce((select jsonb_agg(to_jsonb(c)) from consents c where c.user_id = uid), '[]'::jsonb),
    'events', coalesce((select jsonb_agg(to_jsonb(e) order by e.at) from events e where e.user_id = uid), '[]'::jsonb),
    'taste_profile', (select to_jsonb(t) from user_taste_profiles t where t.user_id = uid),
    'vibe_recipes', coalesce((select jsonb_agg(to_jsonb(r)) from user_vibe_recipes r where r.user_id = uid), '[]'::jsonb),
    'movie_state', coalesce((select jsonb_agg(to_jsonb(s)) from user_movie_state s where s.user_id = uid), '[]'::jsonb),
    'votes', coalesce((select jsonb_agg(to_jsonb(v)) from movie_atom_votes v where v.user_id = uid), '[]'::jsonb)
  );
end $$;

create or replace function kinoo_delete_my_data() returns void
language plpgsql security definer set search_path = public as $$
declare uid uuid := auth.uid();
begin
  if uid is null then raise exception 'sin sesión'; end if;
  perform set_config('kinoo.allow_event_delete', 'on', true);
  delete from events where user_id = uid;
  perform set_config('kinoo.allow_event_delete', 'off', true);
  delete from user_taste_profiles where user_id = uid;
  delete from user_vibe_recipes where user_id = uid;
  delete from user_movie_state where user_id = uid;
  delete from active_decks where user_id = uid;
  delete from movie_atom_votes where user_id = uid;
  delete from follows where follower_id = uid or followee_id = uid;
  delete from group_members where user_id = uid;
  delete from lists where owner_id = uid;
  delete from decks where owner_id = uid and owner_kind <> 'system';
  delete from profiles where user_id = uid;
  -- consents se conserva como prueba de lo aceptado, marcando la revocación.
  insert into consents (user_id, purpose, policy_version, granted) values (uid, 'borrado_de_datos', 'n/a', false);
end $$;

revoke all on function kinoo_export_my_data() from public;
revoke all on function kinoo_delete_my_data() from public;
grant execute on function kinoo_export_my_data() to authenticated;
grant execute on function kinoo_delete_my_data() to authenticated;
