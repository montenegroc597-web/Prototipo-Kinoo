# Documentación de Kinoo

Kinoo ayuda a decidir qué película ver. Este repositorio tiene el prototipo navegable (front) y, desde la v2, el back: base de datos, motor del algoritmo, catálogo, API y modo demo.

## Empieza aquí

| Documento | Para qué |
|---|---|
| [PROGRESS.md](PROGRESS.md) | Estado del proyecto, bitácora y **decisiones tomadas sin Camilo** |
| [KINOO_ALGORITMO_v2.md](KINOO_ALGORITMO_v2.md) | La especificación del algoritmo (fuente de verdad) |
| [KINOO_PLAN_MAESTRO.md](KINOO_PLAN_MAESTRO.md) | Fases F0–F6 y sus comprobaciones |
| [guias/para-camilo-ajustar-el-algoritmo.md](guias/para-camilo-ajustar-el-algoritmo.md) | Cambiar pesos, moods, mazos y frases sin programar |
| [guias/algoritmo-paso-a-paso.md](guias/algoritmo-paso-a-paso.md) | De un evento a una recomendación, con números |
| [guias/base-de-datos.md](guias/base-de-datos.md) | Cada tabla en una línea y el diagrama de relaciones |
| [guias/catalogo.md](guias/catalogo.md) | Cómo entra y se etiqueta una película |
| [guias/contrato-api.md](guias/contrato-api.md) | Endpoints con ejemplos |
| [guias/despliegue.md](guias/despliegue.md) | Pasos manuales pendientes (Pages, Supabase, TMDB) |
| [adr/](adr/) | Decisiones de arquitectura: [0001](adr/0001-estructura.md) repositorio, [0002](adr/0002-monorepo.md) monorepo, [0003](adr/0003-api-y-modo-demo.md) API y modo demo |
| [historico/](historico/) | Versión 1 del algoritmo (pendiente de subir) |

## Estructura

```
apps/web/            Prototipo (front). kinoo-flujo/*.dc.html + src/ (modo demo y adaptador)
packages/shared/     Tipos y contratos: átomos, eventos, configuración, respuestas de la API
packages/engine/     Motor del algoritmo, TypeScript puro. sim/ = usuarios simulados
packages/api/        Lógica de los endpoints (la usan Supabase y el modo demo)
supabase/            migrations/, seed/, functions/ y pruebas sobre PGlite
data/config/         Configuración editable (pesos, moods, mazos, plantillas, parámetros)
data/catalog/        Catálogo piloto, anclas, mazo del equipo, control de calidad
scripts/             Build del sitio, semillas, pipeline del catálogo
e2e/                 Pruebas de punta a punta con Playwright
```

## Cómo correrlo

Requiere Node 22.

```bash
npm ci
```

| Comando | Qué hace |
|---|---|
| `npm test` | Pruebas unitarias: motor, simulador, migraciones con RLS, API y catálogo |
| `npm run typecheck` | Revisa los tipos |
| `npm run sim` | Corre los usuarios simulados y escribe `packages/engine/sim/RESULTADOS.md` |
| `npm run build` | Arma `site/` (prototipo + `_kinoo/kinoo-demo.js`) |
| `npm run serve` | Sirve `site/` en `http://localhost:4173/Prototipo-Kinoo/` |
| `npm run e2e` | Pruebas en el navegador (en la nube: `PW_CHROMIUM_PATH=/opt/pw-browsers/chromium`) |
| `npm run seed` | Genera las semillas SQL desde `data/` |
| `npm run build:functions` | Empaqueta el motor para las Edge Functions |

## Ejemplo con números

Estado al cerrar la v2 (5 de noviembre de 2026):

- 56 pruebas unitarias y 3 e2e en verde.
- 5 de 5 pruebas de aprendizaje. Tras 40 eventos, el mazo trae **6,4 veces** más películas "aceptables" que uno al azar.
- 34 películas en el catálogo (semilla manual; las 300 esperan la clave de TMDB).
