# Contrato de la API

**Para qué sirve esto.** Documenta lo que el front puede pedirle al back. Para conectar un front nuevo paso a paso, ver [`integrar-un-front-nuevo.md`](integrar-un-front-nuevo.md). El mismo contrato lo cumplen las Edge Functions de Supabase y el modo demo (`window.KinooDemo.adapter`). El back habla de acciones, películas, mazos y moods; nunca de gestos ni de pantallas.

## Autenticación

Cada llamada a Supabase lleva dos encabezados:

- `apikey: <SUPABASE_ANON_KEY>`
- `Authorization: Bearer <JWT de la sesión>`

El back saca de ese JWT quién es la persona. RLS garantiza que solo lee y escribe lo suyo. Los errores responden `{ "error": "mensaje" }` con código 400, 401, 404, 405 o 500.

Base:

- Supabase: `https://<proyecto>.supabase.co/functions/v1/` (una función por recurso: `events`, `deck`, `watch`, `onboarding`, `profile`).
- Servidor propio (`apps/api`): `https://<tu-api>/` o `https://<tu-api>/api/`. Las rutas se reconocen por su final, así que funcionan con cualquier prefijo.

`GET /health` responde `{ "ok": true }` sin sesión. `GET /profile` devuelve el perfil y el arquetipo (ver más abajo).

## POST /events

Guarda una o varias acciones (máximo 100). Tipos válidos: `onboarding_choice`, `deck_opened`, `card_flipped`, `saved_intent`, `dismissed`, `marked_seen`, `rewatch_intent`, `deck_completed`, `watch_proposed`, `watch_skipped`, `watch_started`, `watch_confirmed`, `attribute_refuted`, `undo`, `platforms_set`, `super_liked`.

- `super_liked` (estrella): `{ "type": "super_liked", "movie_id": "…", "payload": {} }`. Señal +0,8, η 0,12; la deja en la mano y la sube en la cartelera. Para quitarla, `undo` de ese evento.
- `watch_confirmed` acepta `fell_asleep: true` ("Me dormí"): cuenta como `not_for_me` y la repisa lo muestra en palabras.

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
  "display": { "premise": "Un verano en turquía, una hija y su…", "title": "Aftersun", "subtitle": "Una película de Charlotte Wells", "overview": "Años después, una mujer recuerda unas vacaciones de verano con su padre…", "explanation": "Responde a tu forma de llorar bonito: íntimas y melancólicas.", "pillars": { "ritmo": "pausado", "tono": "melancólico", "historia": "padre e hija", "visual": "luz de verano" } },
  "special_treatment": false
}
```

`display` trae los textos de la carta ya recortados con el estándar de caracteres (ver `integrar-un-front-nuevo.md`). `poster_url` es la URL lista para `<img>` (TMDB o archivo del repositorio); si es `null`, no hay póster. `role` es `afin`, `creador`, `comodin` o `sorpresa`. `special_treatment: true` (sorpresa) pide un tratamiento visual especial. Si el rol es `creador`, llega `curator_name`.

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

## GET /profile/insight

"Lo que el mazo dice de ti". Sale de las acciones reales de la persona. Nunca trae números de afinidad: los niveles son `alto`, `medio` o `bajo`.

```json
{
  "ready": true,
  "title": "ERES TODO UN ROMÁNTICO",
  "kicker": "lo que aprendimos de ti",
  "body": "Te atrapan las historias íntimas y melancólicas, sobre todo para llorar bonito.",
  "traits": [{ "key": "intimidad", "label": "Intimidad", "level": "alto" }, { "key": "melancolica", "label": "Melancolía", "level": "medio" }],
  "moods": [{ "key": "llorar_bonito", "name": "Llorar bonito", "level": "alto" }],
  "archetype": { "key": "romantico", "name": "El Romántico" },
  "empty_text": "Desliza unas cartas más y te contamos lo que el mazo dice de ti."
}
```

- Con menos de `insight_min_signals` señales (o sin ningún gusto positivo), `ready` es `false` y `title`, `body`, `traits`, `moods` y `archetype` llegan vacíos: el front muestra `empty_text`.
- Hasta 3 rasgos (nombre corto del átomo) y hasta 3 moods. Los títulos por arquetipo son plantillas `insight_title_<arquetipo>` en `explanation_templates.json`.

## GET /watch/moods

`{ "moods": [{ "key": "todas", "name": "Todas", "desc": "Un poco de todo" }, { "key": "llorar_bonito", "name": "Llorar bonito", "desc": "Historias para llorar" }, …] }`. "todas" va primero; luego los moods activos de `vibes.json` (la descripción corta es `tagline`).

## GET /watch/billboard

Cartelera de Ver, ordenada por el motor. Parámetro opcional `vibe` (clave, alias o `todas`). Un mood desconocido responde 400. No guarda eventos.

```json
{
  "mood": { "key": "llorar_bonito", "name": "Llorar bonito", "desc": "Historias para llorar" },
  "films": [{
    "id": "past-lives-2023", "title": "Vidas pasadas", "title_size": 38,
    "meta": "1 h 46 · Drama · Romance",
    "quote": "Responde a tu forma de llorar bonito: íntimas y melancólicas.",
    "poster_url": null, "palette": ["#d9772e", "#4a1a08", "#f4e7d0"], "starred": false,
    "providers": [{ "key": "max", "name": "Max", "note": "en tu suscripción", "rent": false }],
    "runtime_min": 106
  }],
  "status": "ok",
  "notice": null
}
```

| `status` | Qué significa |
|---|---|
| `ok` | Hay películas (máximo `billboard_max_films`) |
| `empty_hand` | No hay nada en la mano: llevar a Descubrir |
| `empty_platforms` | Nada de su mano está en sus plataformas |
| `empty_mood` | Nada de su mano encaja con ese mood (`films` vacío) |

- Entra la mano (guardadas y "para repetir"); lo calificado (`watch_confirmed`) no está: pasó a la repisa.
- Orden: el mismo puntaje de Ver (perfil, receta del mood, calidad) más los bonos de recién guardada, match especial y estrella (`watch_star_bonus`). Lo que pidió cambiar con "otra" va al final.
- `palette` es para la carta sin póster: sale del átomo estético más fuerte de la película (`poster_palettes` en `params.json`).
- `providers`: solo las plataformas reales del catálogo, primero las de la persona. `key` sirve para buscar el logo. `rent` siempre es `false` (el catálogo no trae alquiler).

## GET /watch/shelf

Repisa de Ver: lo que ya vio y calificó, lo más reciente primero.

```json
{ "shelf": [{ "id": "her-2013", "title": "Her", "poster_url": "…/posters/her-2013.jpg", "palette": ["#f4c6d7", "#8fa9c9", "#fff4e0"],
  "when": "hace 3 semanas", "rating": "¡Me encantó!", "back": "Para volver a una de tus historias íntimas, ahora sin la sorpresa.",
  "meta": "2 h 06 · Romance · Ciencia ficción", "runtime_min": 126, "providers": [{ "key": "max", "name": "Max", "note": "en tu suscripción", "rent": false }] }] }
```

"Volver a verla" se informa con `POST /events` tipo `rewatch_intent`: la película vuelve a la cartelera.

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

En GitHub Pages no hay servidor: `kinoo-demo.js` corre el mismo servicio en el navegador y guarda los eventos en `localStorage` (clave `kinoo.demo.v2:<user_id>`, una por cuenta). Desde la consola del navegador:

```js
KinooDemo.profile()      // perfil actual y arquetipo
KinooDemo.insight()      // lo que el mazo dice de ti (GET /profile/insight)
KinooDemo.moods()        // selector de mood de Ver (GET /watch/moods)
KinooDemo.billboard('llorar_bonito')  // cartelera (GET /watch/billboard)
KinooDemo.shelf()        // repisa (GET /watch/shelf)
KinooDemo.star(id, true) // estrella → { starred: true }
KinooDemo.rewatch(id)    // volver a verla
KinooDemo.lastWatch()    // última película que salió a ver: plataforma y calificación
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
