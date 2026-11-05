# ADR 0002 · Monorepo con front, motor y back separados

**Estado:** aceptada · 2026-11-05 · rutas y paquetes actualizados por la [ADR 0004](0004-front-back-y-nube.md)

## Contexto

El prototipo vivía en `public/` y GitHub Pages lo publicaba tal cual. Ahora hacen falta un motor del algoritmo que corra en el navegador y en Supabase, tipos compartidos, migraciones y scripts del catálogo.

## Decisión

- `apps/web/`: el prototipo (front). Se movió con `git mv public apps/web`, así que conserva su historia.
- `packages/engine/`: el motor. TypeScript puro, sin dependencias.
- `packages/shared/`: tipos y contratos (eventos, respuestas de la API).
- `supabase/`, `data/`, `scripts/`, `docs/`: como en el plan maestro.
- npm workspaces en la raíz. Las herramientas son TypeScript, Vitest, esbuild, tsx, PGlite y Playwright.
- `npm run build` (`scripts/build-site.mjs`) arma `site/`: copia `apps/web/` y empaqueta el modo demo en `site/_kinoo/kinoo-demo.js`.
- `npm run check:site` verifica que `site/` publique las 86 rutas que publicaba `public/` (lista en `scripts/rutas-publicadas.txt`).

## Despliegue

`deploy.yml` ahora corre `npm ci`, `npm run build` y `npm run check:site`, y publica `site/` en vez de `public/`. Sigue usando "GitHub Actions" como fuente de Pages, así que **Camilo no tiene que cambiar nada en la configuración del repositorio**. Solo se activa al fusionar en `main`.

Se agrega `ci.yml` (typecheck, pruebas, build, rutas y e2e) en cada push a `back/algoritmo-v2` y en cada pull request.

## Consecuencias

- Las URL públicas no cambian: `https://montenegroc597-web.github.io/Prototipo-Kinoo/kinoo-flujo/…`.
- Para mirar el sitio en local hay que construirlo: `npm run build && npm run serve`.
