# Guía para agentes de IA (y personas nuevas en el código)

Kinoo ayuda a decidir qué película ver. Este repositorio tiene el front (prototipo de alta fidelidad), el back (API), el algoritmo de recomendación v2 y su catálogo. La documentación está en español; el código, en inglés.

## Mapa

| Carpeta | Qué es |
|---|---|
| `apps/web/` | **Front.** `public/` = prototipo publicado (no renombrar rutas: hay enlaces compartidos). `src/demo.ts` = modo demo. `src/adapter.ts` = cliente de la API. `e2e/` = Playwright |
| `apps/api/` | **Back.** API HTTP portátil (`createKinooHandler`). `server.node.ts` (Node) y `edge.supabase.ts` (Supabase Edge) |
| `packages/shared` | Tipos y contratos (`CardDTO`, `EventInput`, `posterUrl`…) |
| `packages/config` | Configuración editable del algoritmo (`data/*.json`). **No pongas números del algoritmo en el código: van aquí** |
| `packages/engine` | El algoritmo. Puro: sin IO, sin Node, sin navegador. `sim/` = usuarios simulados |
| `packages/core` | Casos de uso (`KinooService`), puertos (`KinooRepository`) y `KinooRunner` |
| `packages/db` | Migraciones SQL portátiles, proveedores (`supabase`, `postgres`), semillas y repositorios |
| `packages/catalog` | Catálogo: cliente TMDB (real o `fixtures/`), juez sintético, validación, pósters |
| `infra/` | Docker y proyecto de Supabase |
| `docs/` | Especificación, arquitectura, guías y decisiones |

Lee primero [`docs/ARQUITECTURA.md`](docs/ARQUITECTURA.md). Para conectar un front nuevo, [`docs/guias/integrar-un-front-nuevo.md`](docs/guias/integrar-un-front-nuevo.md).

## Comandos

```bash
npm ci                      # Node 22 (ver .nvmrc)
npm run check               # todo lo que corre la CI, menos e2e
npm run test:unit           # motor, núcleo, catálogo, configuración
npm run test:integration    # PostgreSQL en memoria (PGlite), RLS y API HTTP
npm run test:e2e            # navegador (en la nube: PW_CHROMIUM_PATH=/opt/pw-browsers/chromium)
npm run test:sim            # las 5 pruebas de aprendizaje → packages/engine/sim/RESULTADOS.md
npm run sim:perfiles        # 6 tipos de usuario con el catálogo real → docs/SIMULACION-PERFILAMIENTO.md
npm run sim:camilo          # Camilo usando la app en un navegador (después de npm run build)
npm run dev:web             # build + servidor en http://localhost:4173/Prototipo-Kinoo/
npm run lint && npm run format
```

## Reglas que no se negocian

1. **El back recibe acciones, nunca gestos.** No agregues tipos de evento con nombres de gestos (`swipe_up`).
2. **Los eventos solo se agregan.** Nunca edites ni borres eventos. El perfil se recalcula desde ellos.
3. **Todo lo ajustable vive en `packages/config/data`.** Si cambias un JSON de ahí o del catálogo, corre `npm run db:seeds` (la CI verifica que las semillas estén al día).
4. **El motor es puro.** Nada de `fs`, `fetch`, `window` ni `process` en `packages/engine`.
5. **Las explicaciones no llevan números ni %.** Hay pruebas que lo verifican.
6. **Las migraciones no se editan** después de publicadas: crea una nueva (`packages/db/migrations/00NN_….sql`). El aplicador compara sumas de verificación.
7. **La demo pide sesión** (`entrar.html`, cuenta `camilo` / `1234`, en `apps/web/src/session.ts`). Las e2e entran con `loginAsCamilo()`.
8. **No rompas rutas publicadas.** `npm run check:routes -w @kinoo/web` revisa las 86 del prototipo.
9. **Sin secretos en el repositorio.** Usa variables de entorno (`.env.example`).

## Tareas frecuentes

| Quiero… | Dónde | Después |
|---|---|---|
| Cambiar un peso, mood, plantilla o receta de mazo | `packages/config/data/*.json` | `npm run db:seeds && npm test` |
| Agregar películas | `packages/catalog/fixtures/tmdb/movie/<tmdb_id>.json` (o la API real con `TMDB_API_KEY`) | `npm run catalog:fetch && node packages/catalog/scripts/tag.mjs prompts --only-new`, etiquetar el lote, `npm run catalog:posters && npm run catalog:build && npm run db:seeds` |
| Agregar un póster | `apps/web/public/posters/<id>.jpg` | `npm run catalog:posters && npm run catalog:build && npm run db:seeds` |
| Una tabla o columna nueva | `packages/db/migrations/00NN_….sql` + `packages/db/src/rows.ts` | Prueba en `packages/db/test/` |
| Un endpoint nuevo | Caso de uso en `packages/core/src/service.ts`, ruta en `apps/api/src/handler.ts`, tipo en `packages/shared/src/api.ts` | Prueba en `apps/api/test/http.test.ts` y documentarlo en `docs/guias/contrato-api.md` |
| Conectar una pantalla | `docs/guias/integrar-un-front-nuevo.md` | e2e en `apps/web/e2e/` |
| Un texto nuevo en pantalla | Límite en `packages/config/data/params.json` y recorte con `fitText()` en el back (`display.*`) | Tabla en `docs/guias/limites-de-texto.md` y `apps/web/e2e/cartas.spec.ts` |
| Un evento nuevo | Tipo en `packages/shared/src/events.ts`, peso en `packages/config/data/action_weights.json` | Prueba en `packages/engine/test`; revisar `docs/PREGUNTAS-RECOLECCION-DE-DATOS.md` |

## Convenciones

- TypeScript estricto, ESM, Biome (comillas simples, 160 columnas).
- Commits en español, en presente: `Catálogo: pósters locales con inventario`.
- Cada decisión que el equipo deba revisar va a `docs/PROGRESS.md` ("Decisiones tomadas sin Camilo").
