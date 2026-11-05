# ADR 0004 · Front y back separados, base de datos portátil y simulación de TMDB

**Estado:** aceptada · 2026-11-05

## Contexto

Camilo pidió organizar el repositorio "diferenciando front y back, bajo estándares de hoy", dejar todo listo para tener la base de datos en Supabase **o en otra nube**, establecer bien las pruebas y que las películas simulen cómo funcionaría el catálogo real. También pidió que un front nuevo se pueda conectar fácilmente al back.

## Decisión

1. **Estructura:** `apps/web` (front), `apps/api` (back), `packages/*` (compartido), `infra/` (Docker y Supabase). El prototipo se movió a `apps/web/public/` con `git mv`; las rutas publicadas no cambian.
2. **Arquitectura hexagonal en el back.** `packages/core` define el puerto `KinooRepository`. Hay tres adaptadores: `PostgresRepository` (cualquier PostgreSQL), `SupabaseRestRepository` (Supabase por REST, sin dependencias) y `MemoryRepository` (pruebas y demo).
3. **API como función `Request → Response`** (`apps/api/src/handler.ts`). La misma corre en Node (`server.node.ts`, para Docker o cualquier nube), en Supabase Edge (`edge.supabase.ts`) y en Cloudflare, Vercel o Deno Deploy sin cambios.
4. **Migraciones portátiles con proveedor.** Las reglas de seguridad usan `kinoo_current_user()`. `providers/supabase.sql` la define como `auth.uid()`; `providers/postgres.sql`, como `app.user_id` (la pone el servidor en cada transacción, junto con `set local role authenticated`). Un aplicador propio (`packages/db/src/migrate.ts`) registra lo aplicado con suma de verificación. Para el CLI de Supabase, `npm run supabase:build` genera `infra/supabase/migrations` desde la misma fuente.
5. **Autenticación sin dependencias:** JWT HS256 con WebCrypto (el secreto de Supabase u otro proveedor), o validación contra Supabase Auth.
6. **Simulación de TMDB:** `packages/catalog/fixtures/tmdb/movie/<id>.json` con respuestas con la forma real de `GET /movie/{id}` (créditos, palabras clave, reseñas, plataformas por país). `fixtureTransport` implementa `discover`, `search` y `movie` con filtros y paginación. El pipeline es el mismo con la API real (`httpTransport`); sin `TMDB_API_KEY` usa la simulación. Los ids de Kinoo salen de TMDB (`titulo-original-año`).
7. **Pósters:** un archivo por película en `apps/web/public/posters/<id>.jpg`, un inventario generado (`posters.json`) y `poster_url` listo en cada carta (`posterUrl()` en `@kinoo/shared`).
8. **Calidad:** Vitest con proyectos (`unit`, `integration`), Biome (lint y formato), CI en cuatro trabajos, `.nvmrc`, `.editorconfig`, `AGENTS.md`.

## Consecuencias

- Mover la base de Supabase a otra nube no toca el código: cambia el proveedor y el servidor que se despliega.
- Las Edge Functions se reducen a una línea cada una.
- Los datos simulados están marcados (`_simulado`, `source = tmdb_simulado`). Los ids no verificados de TMDB llevan `_id_verificado: false` y se corrigen al correr el pipeline con la API real.
- Las pruebas de integración corren las mismas migraciones con los dos proveedores.
