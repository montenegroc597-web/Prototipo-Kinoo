# ADR 0001 · En qué repositorio y sobre qué estructura se construye

**Estado:** aceptada · 2026-11-05

## Contexto

El plan maestro describe un repositorio con `/kinoo-pruebas/app/`, `/kinoo-pruebas/prueba/`, `?equipo=1`, Supabase, 126 pruebas unitarias y 17 e2e. Ese repositorio es `kinoo-pruebas` (la herramienta de pruebas de usabilidad).

La sesión se abrió sobre `Prototipo-Kinoo`. Durante el diagnóstico, Camilo indicó: **"vas a crear todo con base al de prototipo"** y **"no toques pruebas, crearás lo necesario ahí"**.

`Prototipo-Kinoo` es HTML estático, sin build ni pruebas:

- `public/kinoo-flujo/*.dc.html`: 13 pantallas (Descubrir: Flujo1–5; Ver: FlujoV1–V6). Los datos de las cartas están escritos dentro de cada pantalla.
- `public/_prototipos/dc-runtime.js`: el runtime que dibuja las pantallas.
- `.github/workflows/deploy.yml`: publica `public/` en GitHub Pages en cada push a `main` (`https://montenegroc597-web.github.io/Prototipo-Kinoo/`).

## Decisión

1. Todo el back y el algoritmo se construyen en `Prototipo-Kinoo`. `kinoo-pruebas` no se modifica.
2. Las restricciones del plan sobre `/kinoo-pruebas/app/`, `/prueba/` y `?equipo=1` se cumplen de forma automática porque ese repositorio no se toca. En este repositorio, el enlace que hay que conservar es el de GitHub Pages del prototipo: las mismas rutas (`/Prototipo-Kinoo/kinoo-flujo/…`) deben seguir funcionando.
3. La línea base de pruebas de este repositorio es **0 unitarias y 0 e2e** (no tenía). Las 126 y 17 del plan son de `kinoo-pruebas`.
4. La rama de trabajo es `back/algoritmo-v2`, como pide el plan.

## Consecuencias

- La "comprobación" de F1 se hace sobre las rutas publicadas del prototipo, no sobre pruebas preexistentes.
- Las pruebas nuevas (motor, migraciones, e2e de la demo) son las primeras del repositorio.
- El documento de Argon (v1) no se adjuntó a la sesión: `docs/historico/` queda con una nota.
