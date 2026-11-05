# ADR 0003 · Un solo servicio para la API y el modo demo

**Estado:** aceptada · 2026-11-05 · rutas y paquetes actualizados por la [ADR 0004](0004-front-back-y-nube.md)

## Contexto

El plan pide Edge Functions en Supabase y un modo demo que funcione sin servidor en GitHub Pages. Si cada uno tuviera su propia lógica, se separarían con el tiempo.

Las pantallas del prototipo (`.dc.html`) dibujan sus datos de forma síncrona: necesitan las cartas en el momento de dibujar.

## Decisión

- **`packages/api`** contiene `KinooService`: la lógica de cada endpoint (guardar eventos, abrir mazo, Ver, onboarding). Trabaja sobre una "foto" de la persona (sus eventos y su mazo abierto) y deja lo nuevo en `newEvents` y `deckChanged`.
- **Edge Functions** (`supabase/functions/`): cargan la foto desde Supabase con el JWT de la persona (RLS siempre activo), llaman al servicio y guardan lo nuevo. `npm run build:functions` empaqueta motor y servicio en `_shared/kinoo-core.js`, porque Deno no resuelve los imports sin extensión de los paquetes.
- **Modo demo** (`apps/web/src/demo.ts`, publicado como `_kinoo/kinoo-demo.js`): la foto vive en `localStorage` y el servicio corre en el navegador. Expone `window.KinooDemo` con funciones síncronas para las pantallas y el mismo contrato asíncrono (`adapter`) que el modo Supabase.
- **Adaptador** (`apps/web/src/adapter.ts`): `supabaseAdapter()` habla con las Edge Functions con el mismo contrato. Las pantallas actuales usan el modo demo; una pantalla nueva puede usar cualquiera de los dos.
- **Conexión mínima con el prototipo.** Solo se tocaron tres pantallas:
  - `Flujo1_Descubrir`: cartas, ADN y acciones (guardar, descartar, ya la vi, voltear, salir del mazo).
  - `FlujoV1_Feed`: la mano ordenada por el motor y las acciones "otra" y "abrir en".
  - `FlujoV4_Calificar`: la calificación se guarda como `watch_confirmed`.
  Si `kinoo-demo.js` no carga, las pantallas usan sus datos de ejemplo de siempre (hay una prueba e2e para eso).

## Consecuencias

- La lógica de la API se prueba una vez: en Node, contra PGlite con RLS (`supabase/api.test.ts`).
- Las Edge Functions no se probaron en Deno en esta sesión (no había Deno ni proyecto de Supabase).
- El bloque "93 % contigo" de la carta se oculta cuando el motor está conectado, porque el principio 1 prohíbe mostrar porcentajes. En su lugar, la explicación en palabras aparece al pie de la carta.
- Ver usa el motor para ordenar la mano dentro de cada mood. La pantalla sigue siendo un mazo deslizable (como en el prototipo), pero la primera carta es la propuesta del motor.
