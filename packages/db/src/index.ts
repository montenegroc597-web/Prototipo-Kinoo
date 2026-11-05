// Capa de datos de Kinoo: migraciones portátiles, mapeo de filas y repositorios (PostgreSQL y Supabase REST).
// Este punto de entrada no usa APIs de Node: corre en Node, Deno (Supabase Edge) y otras nubes.
export * from './sql';
export * from './migrate';
export * from './rows';
export * from './postgres-repository';
export * from './supabase-rest-repository';
