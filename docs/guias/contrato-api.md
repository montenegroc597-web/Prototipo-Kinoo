# Contrato de la API

**Para qué sirve esto.** Documenta lo que el front puede pedirle al back. Para conectar un front nuevo paso a paso, ver [`integrar-un-front-nuevo.md`](integrar-un-front-nuevo.md). El mismo contrato lo cumplen las Edge Functions de Supabase y el modo demo (`window.KinooDemo.adapter`). El back habla de acciones, películas, mazos y moods; nunca de gestos ni de pantallas.

## Autenticación

Cada llamada a Supabase lleva dos encabezados:

- `apikey: <SUPABASE_ANON_KEY>`
- `Authorization: Bearer <JWT de la sesión>`

El back saca de ese JWT quién es la persona. RLS garantiza que solo lee y escribe lo suyo. Los errores responden `{ "error": "mensaje" }` con código 400, 401, 404, 405 o 500.

Base:

- Supabase: `https://<proyecto>.supabase.co/functions/v1/` (una función por recurso: `events`, `deck`, `watch`, `onboarding`).
- Servidor propio (`apps/api`): `https://<tu-api>/` o `https://<tu-api>/api/`. Las rutas se reconocen por su final, así que funcionan con cualquier prefijo.

`GET /health` responde `{ "ok": true }` sin sesión. `GET /profile` devuelve el perfil y el arquetipo (ver más abajo).

## POST /events

Guarda una o varias acciones (máximo 100). Tipos válidos: `onboarding_choice`, `deck_opened`, `card_flipped`, `saved_intent`, `dismissed`, `marked_seen`, `rewatch_intent`, `deck_completed`, `watch_proposed`, `watch_skipped`, `watch_started`, `watch_confirmed`, `attribute_refuted`, `undo`, `platforms_set`.

```json
{ "events": [
  { "type": "saved_intent", "movie_id": "past-lives-2023", "payload": { "flipped": true, "vibe": "llorar_bonito", "deck_id": "…", "slot": 3 }, "context": { "surface": "discover" } },
  { "type": "deck_completed", "payload": { "deck_id": "…" } }
] }
```

Respuesta:

```json
{ "accepted": 2, "results": [
  { "id": "…", "save": { "special_match": true, "message": "Esta es muy tú." } },
  { "id": "…", "closing": { "deck_id": "…", "learned": "Hoy te inclinaste por historias íntimas y de luz cálida.", "top_atoms": ["intimidad", "calida"], "saved_posters": [{ "movie_id": "past-lives-2023", "title": "Vidas pasadas", "poster_path": null, "poster_url": null }], "ready_tonight": false } }
] }
```

- `id` y `at` son opcionales; si faltan, los pone el servidor.
- Para deshacer: `{ "type": "undo", "payload": { "undone_event_id": "…" } }`. El perfil se recalcula sin ese evento.

## GET /deck/current

El mazo abierto y sin terminar, o `null`.

```json
{ "deck": { "deck_id": "…", "vibe": "llorar_bonito", "size": 10, "opened_at": "2026-11-05T20:00:00Z", "cards": [ /* CardDTO */ ] } }
```

## POST /deck/open

```json
{ "vibe": "llorar_bonito", "size": 10, "only_my_platforms": false }
```

`size` acepta 5, 10 o 20. `vibe` acepta la clave o un alias del prototipo (`"sufrir"` → `llorar_bonito`). Responde `{ "deck": DeckDTO }`.

**CardDTO.** Trae las dos caras; el front decide cuál mostrar primero:

```json
{
  "slot": 1, "role": "afin", "movie_id": "aftersun-2022",
  "front": { "hook": "UN VERANO EN TURQUÍA…", "pillars": { "ritmo": "pausado", "tono": "melancólico", "historia": "padre e hija", "visual": "luz de verano" } },
  "back": { "title": "Aftersun", "year": 2022, "runtime_min": 101, "genres": ["Drama"], "directors": ["Charlotte Wells"], "poster_path": "posters/aftersun-2022.jpg", "poster_url": "https://montenegroc597-web.github.io/Prototipo-Kinoo/posters/aftersun-2022.jpg", "overview": "Años después, una mujer recuerda…", "providers": ["Max", "Apple TV"] },
  "explanation": "Responde a tu forma de llorar bonito: íntimas y melancólicas.",
  "special_treatment": false
}
```

`poster_url` es la URL lista para `<img>` (TMDB o archivo del repositorio); si es `null`, no hay póster. `role` es `afin`, `creador`, `comodin` o `sorpresa`. `special_treatment: true` (sorpresa) pide un tratamiento visual especial. Si el rol es `creador`, llega `curator_name`.

## GET /watch/proposal

Parámetros opcionales: `max_runtime_min`, `vibe`, `company`.

```json
{ "status": "proposal", "card": { /* CardDTO */ }, "relaxed": ["duration"], "notice": "No tienes nada tan corto en tu mano; esta es un poco más larga.", "filters": { "max_runtime_min": 90 } }
```

| `status` | Qué significa | Qué hace el front |
|---|---|---|
| `proposal` | Hay propuesta | Mostrar `card` y, si existe, `notice` |
| `suggest_discover` | Pidió "otra" tres veces seguidas | Invitar a abrir un sobre en Descubrir |
| `empty_platforms` | Nada de su mano está en sus plataformas | Abrir un mazo con `only_my_platforms: true` |
| `empty_hand` | No ha guardado nada | Llevar a Descubrir |

"Otra" se informa con `POST /events` tipo `watch_skipped`; "salir a la plataforma", con `watch_started`; "¿la viste?", con `watch_confirmed`.

## POST /onboarding

Tres pasos:

```json
{ "step": "platforms", "country": "CO", "providers": ["Netflix", "Max"] }
```
```json
{ "step": "pairs", "n": 6 }
```
→ `{ "pairs": [{ "left_movie_id": "mad-max-fury-road-2015", "right_movie_id": "aftersun-2022", "left_title": "…", "right_title": "…" }] }`
```json
{ "step": "choices", "choices": [{ "chosen_movie_id": "aftersun-2022", "rejected_movie_id": "mad-max-fury-road-2015" }] }
```
→ `{ "profile": { "user_id": "…", "vector": { … }, "signal_count": 12, "archetype": { "key": "romantico", "name": "El Romántico", "top_atoms": ["intimidad", "carga_emocional", "melancolica"] } } }`

## Modo demo

En GitHub Pages no hay servidor: `kinoo-demo.js` corre el mismo servicio en el navegador y guarda los eventos en `localStorage` (clave `kinoo.demo.v2`). Desde la consola del navegador:

```js
KinooDemo.profile()      // perfil actual y arquetipo
KinooDemo.events()       // historial de eventos
KinooDemo.reset()        // empezar de cero
```

## Ejemplo con números

Ana guarda *Aftersun* volteada dentro de "Llorar bonito" (`saved_intent`, `flipped: true`). La configuración dice `w = 0,4` y `η = 0,08`. Su rasgo distintivo melancólico es 0,9 y su perfil estaba en 0,30:

```
0,30 + 0,08 × (0,4 × 0,9 − 0,30) = 0,30 + 0,08 × 0,06 = 0,305
```

Guardar mueve poco. Si luego confirma "Me encantó" (`w = 1,0`, `η = 0,25`):

```
0,305 + 0,25 × (0,9 − 0,305) = 0,454
```

Por eso "verla y que le encante" es la señal reina.
