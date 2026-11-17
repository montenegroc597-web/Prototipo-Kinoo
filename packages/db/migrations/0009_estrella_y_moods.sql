-- Kinoo v2 · 0009 · Evento nuevo "super_liked" (estrella en Ver, P7.3) y descripción corta de cada mood para el selector de Ver.

alter table events drop constraint if exists events_type_check;
alter table events add constraint events_type_check check (type in ('onboarding_choice','deck_opened','card_flipped','saved_intent','dismissed','marked_seen','rewatch_intent','deck_completed','watch_proposed','watch_skipped','watch_started','watch_confirmed','attribute_refuted','undo','platforms_set','super_liked'));

alter table vibes add column if not exists tagline text check (tagline is null or char_length(tagline) <= 28);
