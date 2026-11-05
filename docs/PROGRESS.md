# Progreso

## Estado actual
- Fase: F3 · Motor del algoritmo
- Última tarea terminada: F3 · módulos del motor (rasgo distintivo, aprendizaje, puntaje, mazos, Ver, explicaciones, onboarding, arquetipos)
- Siguiente tarea: pruebas unitarias y simulador de usuarios
- Bloqueos: sin `TMDB_API_KEY` y sin acceso de red a `api.themoviedb.org` (afecta a F4)
- Última actualización: 2026-11-05 03:40

## Fases
| Fase | Estado | Comprobación |
|---|---|---|
| F0 | ✅ | Línea base: 0 unitarias, 0 e2e (el repositorio no tenía pruebas). Inventario abajo |
| F1 | ✅ | 86/86 rutas publicadas en `site/`; 86 archivos movidos con `git mv` sin cambios de contenido; typecheck limpio; 1/1 unitaria y 1/1 e2e (rutas) |
| F2 | ✅ | 6 migraciones aplicadas desde cero en PGlite + pgvector; 10/10 pruebas (RLS de eventos y perfiles, solo agregar, votos, exportar y borrar) |
| F3 | ⬜ | |
| F4 | ⬜ | |
| F5 | ⬜ | |
| F6 | ⬜ | |

## Inventario del repositorio (F0)
- **Tecnología:** HTML estático. Cada pantalla es un archivo `.dc.html` que dibuja `public/_prototipos/dc-runtime.js`. No hay `package.json`, build ni pruebas.
- **Pantallas:** Descubrir = `Flujo1_Descubrir` (mazo de 10 cartas, datos escritos en la pantalla), `Flujo2_Resumen`, `Flujo2b_Ticket`, `Flujo2c_Perfil`, `Flujo3_Minijuego`, `Flujo4_Eleccion`, `Flujo5_Inicio`. Ver = `FlujoV1_Feed` a `FlujoV6_Gracias`.
- **Imágenes:** `public/kinoo-flujo/_blob/` (nombres con hash: no se renombran).
- **Despliegue:** `.github/workflows/deploy.yml` publica `public/` en GitHub Pages con cada push a `main`.
- **Supabase:** no se usa en este repositorio.
- **Pruebas:** ninguna. Las "126 unitarias y 17 e2e" del plan son de `kinoo-pruebas`. Ahí se midieron 67 unitarias en verde el 2026-11-05 (solo lectura, sin cambios).

## Bitácora
- 2026-11-05 03:40 · F0 · Diagnóstico. El plan describe `kinoo-pruebas`, pero Camilo indicó construir en `Prototipo-Kinoo` y no tocar `kinoo-pruebas`. Ver `adr/0001-estructura.md`.

- 2026-11-05 03:55 · F1 · `public/` → `apps/web/` con `git mv`. Build a `site/`, `check:site`, CI nueva. Ver `adr/0002-monorepo.md`.
- 2026-11-05 04:10 · F2 · Configuración en `data/config/*.json` → `npm run seed` → `supabase/seed/`. 6 migraciones y pruebas sobre PGlite.
- 2026-11-05 04:30 · F3 · Módulos del motor escritos. Por indicación de Camilo, las cartas de tarot pasan a ser **arquetipos de perfil** (misma idea, sin mencionar el tarot): tabla `archetypes`, `data/config/archetypes.json`.

## Decisiones tomadas sin Camilo
- La línea base es 0/0 porque el prototipo no tenía pruebas. Las pruebas nuevas son las primeras del repositorio.

- Se publica `site/` (copia de `apps/web/` + modo demo) en vez de `public/`. Las rutas no cambian y la fuente de Pages sigue siendo GitHub Actions.
- Para las e2e en la sesión en la nube se usa el Chromium preinstalado (`PW_CHROMIUM_PATH`). En CI, Playwright instala el suyo.
- **Moods del piloto:** 7, unificando el carrete de Ver: Llorar bonito, Apagar el cerebro, Escapar un rato, Salir pensando, Solo reírme, Algo raro y Cine del bueno. "Sufrir bonito" y "Sentir algo" quedan como alias de "Llorar bonito" (la fusión sigue pendiente, como dice la especificación). Las recetas semilla, menos la de Llorar bonito, son propuestas mías.
- **`marked_seen` con reacción:** la especificación dice que la reacción es opcional, pero solo da el peso sin reacción. Agregué tres variantes (`loved` +1,0/0,20; `liked` +0,4/0,10; `not_for_me` −0,6/0,15), un poco más suaves que `watch_confirmed` porque la vio antes de Kinoo.
- **Mano vacía sin números:** el ejemplo de la especificación ("esta dura 1 h 52") tiene números. Para cumplir la regla dura, el aviso dice "No tienes nada tan corto en tu mano; esta es un poco más larga". La duración de la película sigue a la vista en la carta.
- **Calidad:** `calidad(m)` es un promedio bayesiano de la nota de TMDB: `(v·R + 500·6,5) / (v + 500) / 10`.
- **Plataformas del usuario:** se guardan en `profiles.providers` y con un evento `platforms_set` (nuevo, no estaba en la tabla de eventos).
- **Borrado de datos:** `kinoo_delete_my_data()` es la única vía que puede borrar eventos, por la Ley 1581.
- **Nombres de los arquetipos:** El Explorador, El Observador, El Romántico, El Nocturno y El Luminoso (antes El Loco, El Ermitaño, Los Amantes, La Luna y La Estrella). Son una propuesta; se cambian en `data/config/archetypes.json`.

## Para revisar cuando vuelvas
- Subir el documento de Argon a `docs/historico/`.
