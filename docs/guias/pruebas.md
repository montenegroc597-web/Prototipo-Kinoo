# Pruebas

**Para qué sirve esto.** Explica qué se prueba, dónde y cómo correrlo. Las pruebas son la red de seguridad: si alguien cambia un peso, una tabla o una pantalla y rompe algo, una prueba lo dice antes de publicar.

## La pirámide

| Nivel | Comando | Qué cubre | Dónde |
|---|---|---|---|
| **Unitarias** | `npm run test:unit` | El motor (aprendizaje, puntaje, mazos, Ver, explicaciones), el núcleo con repositorio en memoria, la configuración editable, el catálogo y la simulación de TMDB, las rutas del front | `packages/*/test`, `apps/web/test` |
| **Simulación** | `npm run test:sim` (también dentro de las unitarias) | Las 5 pruebas de aprendizaje de la sección 16 con usuarios sintéticos | `packages/engine/sim` |
| **Integración** | `npm run test:integration` | Migraciones en los dos proveedores (Supabase y PostgreSQL genérico), reglas de seguridad por fila (RLS), aplicador de migraciones, repositorios, API HTTP completa con JWT | `packages/db/test`, `apps/api/test` |
| **E2E** | `npm run test:e2e` | El prototipo en un navegador real: abrir mazo, guardar, Ver, "Me encantó"; las pantallas sin motor; las rutas | `apps/web/e2e` |
| **Calidad** | `npm run lint`, `npm run typecheck`, `npm run db:seeds:check` | Estilo, tipos y semillas al día | — |

`npm run check` corre todo menos las e2e. La CI (`.github/workflows/ci.yml`) corre las cuatro capas en paralelo en cada pull request.

## Qué protege cada grupo

- **Configuración** (`packages/config/test`): si alguien edita un JSON y deja un átomo mal escrito, un peso fuera de rango, una plantilla con números o una receta de mazo con posiciones de más, la prueba falla y explica cuál.
- **RLS** (`packages/db/test/migrations.test.ts`): Ana no puede leer ni escribir los eventos de Leo, con Supabase y sin él.
- **API** (`apps/api/test/http.test.ts`): 401 sin sesión, 404 o 405 en rutas equivocadas, 400 con mensaje en español, y el flujo completo.
- **Catálogo** (`packages/catalog/test`): las 69 fichas tienen la forma de TMDB, el pipeline sin red reproduce exactamente `source_movies.json`, las cuotas se respetan, cada póster local existe.

## En la nube (Claude Code)

El Chromium ya está instalado:

```bash
PW_CHROMIUM_PATH=/opt/pw-browsers/chromium npm run test:e2e
```

## Ejemplo con números

Estado al 5 de noviembre de 2026: **116 unitarias e integración** y **3 e2e** en verde. La simulación da 6,4 veces más aciertos que el azar tras 40 eventos. Las de integración tardan unos 15 segundos porque crean 10 bases PostgreSQL en memoria.
