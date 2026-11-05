# Kinoo · Plan maestro del back y del algoritmo

**Versión:** 1.1 · 5 de noviembre de 2026 (ajustada al repositorio `Prototipo-Kinoo`)
**Se usa junto con:** `KINOO_PROMPT_MAESTRO.md` (las instrucciones para el modelo) y `KINOO_ALGORITMO_v2.md` (la especificación).
**Modelo recomendado:** Claude Opus 5.5 en Claude Code. Para tareas mecánicas (etiquetar lotes de películas), subagentes con Sonnet o Haiku.

## Ajustes de la versión 1.1

Camilo pidió construir todo sobre el repositorio del prototipo (`Prototipo-Kinoo`) y no tocar `kinoo-pruebas`. Esto cambia lo siguiente frente a la 1.0:

| Tema | v1.0 | v1.1 |
|---|---|---|
| Repositorio | `kinoo-pruebas` | `Prototipo-Kinoo`. `kinoo-pruebas` no se modifica |
| Enlaces que no se rompen | `/kinoo-pruebas/app/`, `/kinoo-pruebas/prueba/`, `?equipo=1` | `https://montenegroc597-web.github.io/Prototipo-Kinoo/` y todas las rutas `kinoo-flujo/…` (86 archivos, lista en `scripts/rutas-publicadas.txt`) |
| Línea base de pruebas | 126 unitarias, 17 e2e | 0 y 0: el prototipo no tenía pruebas. Las de este plan son las primeras |
| Herramienta de pruebas (`/prueba/`) | Vive en el mismo repositorio | Vive en `kinoo-pruebas`, intacta por construcción |
| Cartas del perfil | Cartas de tarot | Arquetipos de perfil, sin mencionar el tarot (`data/config/archetypes.json`) |
| Front que se conecta | App de la herramienta de pruebas | Las pantallas `.dc.html` del prototipo (Descubrir: `Flujo1_Descubrir`; Ver: `FlujoV1_Feed`) |

Detalle en `docs/adr/0001-estructura.md` y `docs/adr/0002-monorepo.md`.

## Ajustes de la versión 1.2 · F7

Después de F6, Camilo pidió una fase más: **F7 · Reorganización front/back, nube y simulación de TMDB.**

- Front en `apps/web`, back en `apps/api`, paquetes compartidos en `packages/`, infraestructura en `infra/`.
- Base de datos portátil: las mismas migraciones en Supabase o en cualquier PostgreSQL (proveedores), con aplicador propio, Docker y CLI de Supabase.
- Pruebas por capas: unitarias, integración (dos proveedores, API HTTP), e2e, lint y tipos.
- Simulación de TMDB con fixtures del formato real y el mismo pipeline. Pósters locales con inventario.
- Documentación: arquitectura, guía para integrar un front nuevo, pruebas, `AGENTS.md`.

Comprobación: todo `npm run check` en verde, e2e en verde y la documentación enlazada. Detalle en `docs/adr/0004-front-back-y-nube.md`.

---

## 1. Objetivo

Construir el back de Kinoo con el algoritmo v2, etiquetar un catálogo piloto de 300 películas y conectar el prototipo actual, reorganizando el repositorio para separar front y back. Todo documentado para que el equipo lo entienda y lo pueda ajustar.

## 2. Alcance

**Entra:**

- Reorganizar el repositorio del prototipo (front y back separados) sin romper los enlaces públicos ni la herramienta de pruebas.
- Base de datos en Supabase (migraciones SQL), con las tablas sociales creadas pero sin usar.
- Motor del algoritmo como librería TypeScript pura, probada.
- Pipeline de catálogo: TMDB + juez sintético, 300 películas.
- API (Supabase Edge Functions) y un **modo demo** que funciona sin servidor, con el catálogo en JSON.
- Conexión de Ver y Descubrir del prototipo al motor.
- Documentación técnica y una guía para Camilo.

**No entra:**

- Pantallas de Comunidad o de la capa social.
- Embeddings y búsqueda por texto libre (solo se deja la columna).
- Series, pagos, Kinoo Pro, sillas de cine, modo a ciegas.
- Cambios visuales al prototipo más allá de conectar datos.
- Desplegar a producción ni fusionar en `main`: eso lo decide Camilo al revisar.

---

## 3. Antes de dejarlo trabajando solo (checklist de Camilo)

| # | Qué | Para qué | ¿Obligatorio? |
|---|---|---|---|
| 1 | Abrir la sesión de Claude Code conectada a `Prototipo-Kinoo` | Que trabaje sobre tu código | Sí |
| 2 | Subir `KINOO_ALGORITMO_v2.md` y `KINOO_PLAN_MAESTRO.md` a una carpeta `docs/` del repositorio (o adjuntarlos a la sesión) | El prompt los lee desde ahí | Sí |
| 3 | Subir también el documento de Argon a `docs/historico/` | Referencia | Recomendado |
| 4 | Crear una clave de la API de TMDB (gratis, en themoviedb.org → Configuración → API) y guardarla como variable de entorno `TMDB_API_KEY` en el entorno de la sesión | Traer las 300 películas | Sí, o el catálogo queda en 30 películas de semilla |
| 5 | Permitir acceso de red a `api.themoviedb.org` e `image.tmdb.org` (y `api.anthropic.com` si usas el punto 6) en la configuración del entorno | El entorno en la nube bloquea dominios que no están en su lista | Sí, junto con el 4 |
| 6 | (Opcional) Clave de la API de Anthropic como `ANTHROPIC_API_KEY` | Etiquetar con Haiku o Sonnet en lote, más barato | No: si falta, etiqueta con subagentes dentro de la sesión |
| 7 | (Opcional) Proyecto de Supabase para el producto: `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` | Aplicar las migraciones de verdad | No: las migraciones se prueban con una base de datos local en memoria |
| 8 | Pegar el contenido de `KINOO_PROMPT_MAESTRO.md` como primer mensaje | Arrancar | Sí |

**No uses el proyecto de Supabase de las pruebas de usabilidad para el producto.** Si solo tienes ese, no configures el punto 7.

---

## 4. Estructura objetivo del repositorio

```
/
├── apps/
│   └── web/                 # El prototipo actual (front). Conserva las rutas kinoo-flujo/…
├── packages/
│   ├── engine/              # Motor del algoritmo: TypeScript puro, sin dependencias de Node ni del navegador
│   └── shared/              # Tipos y contratos: eventos, respuestas de la API
├── supabase/
│   ├── migrations/          # SQL numerado
│   ├── seed/                # Datos iniciales: átomos, moods, pesos, recetas, catálogo
│   └── functions/           # Edge Functions: deck, events, watch, onboarding
├── data/
│   ├── config/              # Fuente editable de la configuración (JSON)
│   └── catalog/             # Catálogo piloto, anclas, CSV de revisión
├── scripts/
│   └── catalog/             # Traer de TMDB, etiquetar, validar, exportar
├── docs/
│   ├── README.md            # Índice de la documentación
│   ├── PROGRESS.md          # Bitácora y estado de las fases (se actualiza siempre)
│   ├── KINOO_ALGORITMO_v2.md
│   ├── KINOO_PLAN_MAESTRO.md
│   ├── adr/                 # Decisiones de arquitectura, una por archivo
│   ├── guias/               # Guías para personas (ver fase 6)
│   └── historico/
└── .github/workflows/       # Pruebas y despliegue a GitHub Pages
```

El modelo puede ajustar esta estructura si el repositorio lo exige, y lo deja registrado como decisión de arquitectura (ADR).

---

## 5. Fases

Las fases están ordenadas por valor: si el crédito se acaba, lo construido sirve por sí solo. Cada fase termina con una **comprobación**: no se pasa a la siguiente sin cumplirla. Cada fase también deja su documentación; la última solo la consolida.

El costo relativo es una estimación del peso de cada fase dentro del presupuesto.

### F0 · Diagnóstico y línea base · costo bajo

**Objetivo:** entender el repositorio antes de tocarlo.

- Inventario del repositorio: tecnología, cómo se construye, cómo se despliega a GitHub Pages, dónde están `/app/` y `/prueba/`, cómo se usa Supabase en las pruebas, dónde están las 126 pruebas unitarias y las 17 e2e.
- Correr las pruebas actuales y anotar el resultado como **línea base**.
- Crear la rama `back/algoritmo-v2`.
- Crear `docs/PROGRESS.md` y `docs/adr/0001-estructura.md`.

**Comprobación:** existe la línea base de pruebas (aunque alguna falle, queda anotada) y `PROGRESS.md` describe el repositorio y el plan.

### F1 · Reorganización front / back · costo medio

**Objetivo:** llevar el repositorio a la estructura objetivo sin cambiar el comportamiento.

- Mover el prototipo a `apps/web/` con `git mv` para conservar la historia.
- Configurar el espacio de trabajo (workspaces) con `packages/engine` y `packages/shared` vacíos pero compilando.
- Ajustar la construcción para que la salida publique exactamente los mismos caminos del prototipo (`/Prototipo-Kinoo/kinoo-flujo/…`).
- Si el despliegue a GitHub Pages debe cambiar (por ejemplo, de "rama" a "GitHub Actions"), dejar el flujo listo y **documentar el paso manual** que debe hacer Camilo. No cambiar la configuración del repositorio.

**Comprobación:** las mismas pruebas de la línea base pasan; la construcción genera los mismos caminos; `docs/adr/0002-monorepo.md` explica la estructura.

### F2 · Modelo de datos · costo medio

**Objetivo:** la base de datos completa de la sección 4 a la 15 de la especificación.

- Migraciones SQL numeradas: `atoms`, `movies` (con ADN, trazabilidad del juez, plataformas por país y columna de embedding vacía con pgvector), `movie_atom_votes`, `vibes`, `archetypes`, `action_weights`, `deck_recipes`, `explanation_templates`, `config` (parámetros sueltos), `events` (solo agregar), `user_taste_profiles`, `user_vibe_recipes`, `user_movie_state`, `active_decks`, `consents`, y las sociales: `profiles`, `follows`, `decks`, `deck_items`, `lists`, `groups`, `group_members`.
- Reglas de seguridad por fila (RLS) en todas las tablas de usuario.
- Semillas de configuración generadas desde `data/config/*.json` (una sola fuente editable).
- Esquema separado para los datos de las pruebas de usabilidad, o nota explícita de cómo se mantienen aparte.

**Comprobación:** las migraciones se aplican desde cero sin errores en una base PostgreSQL local (PGlite con la extensión vector, o el CLI de Supabase si está disponible); hay pruebas que verifican que un usuario no puede leer los eventos de otro; `docs/guias/base-de-datos.md` explica cada tabla en una línea y el diagrama de relaciones.

### F3 · Motor del algoritmo · costo alto · **la fase más importante**

**Objetivo:** `packages/engine` implementa la especificación y demuestra que aprende.

- Rasgo distintivo, actualización del perfil y de las recetas de mood, confianza.
- Puntaje, candidatos y filtros.
- Armador de mazos por receta (tamaños 5, 10 y 20), los cuatro roles con sus reglas de reemplazo, diversidad, match especial, cierre del mazo.
- Decisor de Ver con el límite de "otra" y la mano vacía.
- Explicador con plantillas.
- Onboarding: elección de pares y carta de perfil (arquetipo).
- Recalcular un perfil completo desde una lista de eventos.
- La configuración entra como parámetro: el motor no lee archivos ni base de datos.
- Simulador de usuarios sintéticos (`packages/engine/sim/`).

**Comprobación:** pruebas unitarias de cada pieza y las cinco pruebas de la sección 16 de la especificación pasando, con sus resultados anotados en `PROGRESS.md`. Si un criterio no se cumple con los valores iniciales, ajustar parámetros en la configuración (no en el código) y documentar el cambio. `docs/guias/algoritmo-paso-a-paso.md` explica el recorrido de un evento hasta una recomendación, con números.

### F4 · Catálogo piloto de 300 películas · costo medio

**Objetivo:** el catálogo etiquetado y validado.

- Script de selección con las cuotas de la sección 12.2 (todo vía TMDB, con plataformas en Colombia).
- Juez sintético con esquema estricto, anclas y trazabilidad. Con `ANTHROPIC_API_KEY`, usar la API por lotes con Haiku o Sonnet; sin ella, subagentes con un modelo económico, en lotes de 20, escribiendo a archivos.
- Validaciones de la sección 12.4 y CSV de revisión humana de 20 películas.
- Exportar `data/catalog/movies.pilot.json` y la semilla SQL.
- **Sin clave de TMDB:** crear una semilla de 30 películas conocidas, marcada como `semilla_manual`, dejar el pipeline listo y anotarlo como bloqueo en `PROGRESS.md`.

**Comprobación:** 300 películas válidas contra el esquema (o 30 de semilla y el bloqueo anotado); controles de dispersión y de frases gancho aprobados; error de las anclas 0,15 o menos; `docs/guias/catalogo.md` explica cómo agregar o re-etiquetar películas.

### F5 · API y conexión con el prototipo · costo alto

**Objetivo:** Ver y Descubrir funcionan con el motor real.

- Edge Functions: `POST /events`, `GET /deck/current`, `POST /deck/open`, `GET /watch/proposal`, `POST /onboarding`. Todas usan `packages/engine`.
- Adaptador de datos en el front con dos modos: **Supabase** (si hay claves) y **demo** (motor en el navegador, catálogo en JSON, eventos en almacenamiento local). El modo demo es el que se publica en GitHub Pages.
- Conectar Descubrir (abrir mazo, cartas con las dos caras, guardar, descartar, cierre del mazo) y Ver (propuesta, otra, salir, "¿La viste?").
- No cambiar la herramienta de pruebas: vive en `kinoo-pruebas` y no se toca.

**Comprobación:** pasan las pruebas de la línea base más pruebas e2e nuevas: abrir un mazo y recibir las cartas del motor, guardar una y verla en Ver, confirmar "Me encantó" y comprobar que el perfil cambió. `docs/guias/contrato-api.md` documenta cada endpoint con ejemplos.

### F6 · Documentación y cierre · costo bajo

**Objetivo:** que el equipo pueda entender, operar y ajustar todo.

- `docs/README.md`: índice y cómo correr el proyecto.
- `docs/guias/para-camilo-ajustar-el-algoritmo.md`: cómo cambiar pesos, moods, recetas de mazo y plantillas **sin programar**, con ejemplos.
- `docs/guias/despliegue.md`: pasos manuales pendientes (Supabase, GitHub Pages).
- Abrir un pull request de `back/algoritmo-v2` hacia `main` con el resumen. **No fusionarlo.**

**Comprobación:** todos los documentos existen y enlazan entre sí; el pull request está abierto; `PROGRESS.md` marca el plan como completo.

---

## 6. Registro de progreso

`docs/PROGRESS.md` es la memoria del proyecto. Se actualiza **al terminar cada tarea**, no al final de la fase, y se hace commit y push en el mismo momento.

Formato:

```markdown
# Progreso

## Estado actual
- Fase: F3 · Motor del algoritmo
- Última tarea terminada: armador de mazos con receta de 10
- Siguiente tarea: comodín y sorpresa
- Bloqueos: ninguno
- Última actualización: 2026-11-05 03:40

## Fases
| Fase | Estado | Comprobación |
|---|---|---|
| F0 | ✅ | Línea base: 126/126 unitarias, 17/17 e2e |
| F1 | ✅ | Mismas pruebas, mismos caminos |
| F2 | ✅ | Migraciones en PGlite, RLS probada |
| F3 | 🟡 | 3 de 5 pruebas de simulación |
| F4 | ⬜ | |
| F5 | ⬜ | |
| F6 | ⬜ | |

## Bitácora
- 2026-11-05 03:40 · F3 · Armador de mazos. Decisión: … Motivo: …

## Decisiones tomadas sin Camilo
- …

## Para revisar cuando vuelvas
- …
```

---

## 7. Si se acaba el crédito

El modelo **no puede ver tu saldo**, así que el plan no depende de que avise a tiempo. Depende de tres hábitos:

1. **Commit y push después de cada tarea**, con `PROGRESS.md` al día. Lo que no está en GitHub no existe.
2. **Fases ordenadas por valor.** Con F0 a F3 terminadas ya tienes el algoritmo funcionando y probado.
3. **Contexto liviano.** No leer archivos enormes enteros, no pegar el catálogo en la conversación, usar scripts. Eso alarga el crédito.

Si el sistema avisa que el contexto o el crédito se están acabando, el modelo escribe de inmediato en `PROGRESS.md` dónde quedó y qué sigue, y hace push.

### Cómo reanudar

En una sesión nueva sobre la rama `back/algoritmo-v2`, pega:

> Continúa el proyecto Kinoo. Lee `docs/PROGRESS.md`, `docs/KINOO_PLAN_MAESTRO.md` y `docs/KINOO_ALGORITMO_v2.md`. Verifica que la última comprobación registrada sigue pasando y continúa desde la siguiente tarea, con las mismas reglas.

---

## 8. Qué revisar cuando vuelvas

1. `docs/PROGRESS.md`: en qué fase quedó y la sección "Decisiones tomadas sin Camilo".
2. Los resultados de la simulación (F3): ¿aprende?
3. El CSV de revisión del catálogo (F4): ¿las etiquetas de esas 20 películas te parecen correctas?
4. La guía para ajustar el algoritmo.
5. El pull request: revisarlo antes de fusionar, porque `main` publica el enlace que usan las pruebas.
