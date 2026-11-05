-- Kinoo v2 · 0008 · Nombre corto de cada átomo para los chips de tema de la ficha ADN (máximo 14 caracteres).
alter table atoms add column if not exists theme text check (theme is null or char_length(theme) <= 14);
