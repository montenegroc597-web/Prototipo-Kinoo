# Progreso

## Estado actual
- Fase: F1 · Reorganización front / back
- Última tarea terminada: F0 · diagnóstico y línea base
- Siguiente tarea: mover `public/` a `apps/web/` con `git mv` y crear el espacio de trabajo
- Bloqueos: ninguno
- Última actualización: 2026-11-05 03:40

## Fases
| Fase | Estado | Comprobación |
|---|---|---|
| F0 | ✅ | Línea base: 0 unitarias, 0 e2e (el repositorio no tenía pruebas). Inventario abajo |
| F1 | ⬜ | |
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

## Decisiones tomadas sin Camilo
- La línea base es 0/0 porque el prototipo no tenía pruebas. Las pruebas nuevas son las primeras del repositorio.

## Para revisar cuando vuelvas
- Subir el documento de Argon a `docs/historico/`.
