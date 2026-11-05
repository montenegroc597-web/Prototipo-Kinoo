# Progreso

## Estado actual
- Fase: F2 · Modelo de datos
- Última tarea terminada: F1 · reorganización (apps/web, workspaces, build, CI)
- Siguiente tarea: configuración en `data/config/*.json` y migraciones SQL
- Bloqueos: ninguno
- Última actualización: 2026-11-05 03:40

## Fases
| Fase | Estado | Comprobación |
|---|---|---|
| F0 | ✅ | Línea base: 0 unitarias, 0 e2e (el repositorio no tenía pruebas). Inventario abajo |
| F1 | ✅ | 86/86 rutas publicadas en `site/`; 86 archivos movidos con `git mv` sin cambios de contenido; typecheck limpio; 1/1 unitaria y 1/1 e2e (rutas) |
| F2 | ⬜ | |
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

## Decisiones tomadas sin Camilo
- La línea base es 0/0 porque el prototipo no tenía pruebas. Las pruebas nuevas son las primeras del repositorio.

- Se publica `site/` (copia de `apps/web/` + modo demo) en vez de `public/`. Las rutas no cambian y la fuente de Pages sigue siendo GitHub Actions.
- Para las e2e en la sesión en la nube se usa el Chromium preinstalado (`PW_CHROMIUM_PATH`). En CI, Playwright instala el suyo.

## Para revisar cuando vuelvas
- Subir el documento de Argon a `docs/historico/`.
