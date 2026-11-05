# Integrar un front nuevo con el back

**Para qué sirve esto.** El prototipo actual (`.dc.html`) se va a reemplazar por un front nuevo. Esta guía dice exactamente cómo conectarlo al back sin tocar el algoritmo. Está escrita para una persona o un modelo de IA. Si eres un modelo, lee también [`AGENTS.md`](../../AGENTS.md).

## Las cuatro reglas

1. **El front manda acciones, no gestos.** Un swipe, un botón o una tecla se traducen a un evento (`saved_intent`, `dismissed`…). Si mañana el gesto cambia, el back no se entera.
2. **El front no calcula nada del algoritmo.** No ordena, no puntúa y no explica. Muestra lo que devuelve el back, en el orden en que lo devuelve.
3. **Nunca se muestran porcentajes ni números de afinidad.** Las razones llegan en `explanation`, ya en palabras.
4. **Los tipos están en `@kinoo/shared`.** Úsalos en vez de redefinirlos: `CardDTO`, `DeckDTO`, `WatchProposalDTO`, `EventInput`…

## Paso 1 · Elegir el adaptador

Los dos modos cumplen la misma interfaz `KinooAdapter` (`apps/web/src/adapter.ts`):

```ts
interface KinooAdapter {
  postEvents(events: EventInput[]): Promise<EventsResult>;
  currentDeck(): Promise<DeckDTO | null>;
  openDeck(o?: { vibe?: string | null; size?: 5 | 10 | 20; only_my_platforms?: boolean }): Promise<DeckDTO>;
  watchProposal(filters?: WatchFilters): Promise<WatchProposalDTO>;
  onboarding(body: unknown): Promise<{ pairs: OnboardingPairDTO[] } | { profile: ProfileDTO }>;
}
```

| Modo | Cuándo | Cómo se crea |
|---|---|---|
| **Demo** | Prototipo, pruebas de usabilidad, GitHub Pages. Sin servidor | `window.KinooDemo.adapter` (carga `_kinoo/kinoo-demo.js`) |
| **Supabase** | Producto con cuentas | `supabaseAdapter({ url, anonKey, accessToken })` |
| **Servidor propio** | Cualquier otra nube | El mismo `supabaseAdapter` apuntando a la URL de `apps/api` (las rutas son iguales) |

Empieza en modo demo; cambiar de modo es cambiar una línea.

**Sesión.** En modo demo, la sesión es la de `entrar.html` (`apps/web/src/session.ts`: `getSession()`, `login()`, `logout()`); cada cuenta tiene su `user_id` (UUID) y su historial. Con back, la sesión la da el proveedor de identidad (Supabase Auth u otro) y el front manda su JWT en `Authorization: Bearer …`. Usa el mismo `user_id` para que el historial de pruebas se pueda migrar.

## Paso 2 · Pantalla por pantalla

### Descubrir (mazo de cartas)

| Momento | Llamada | Qué mostrar |
|---|---|---|
| Entrar | `currentDeck()`; si es `null`, `openDeck({ vibe, size })` | `deck.cards` en orden. Son 5, 10 o 20 |
| Cara A | — | `card.front.hook` (frase gancho) y `card.front.pillars` (ritmo, tono, historia, visual) |
| Voltear | `postEvents([{ type: 'card_flipped', payload: { deck_id, slot } }])` | Cara B: `card.back.*` y `card.back.poster_url` |
| "Quiero verla" | `postEvents([{ type: 'saved_intent', movie_id, payload: { flipped, deck_id, slot, vibe } }])` | Si `results[].save.special_match`, mostrar "Esta es muy tú" |
| "No me interesa" | `dismissed` con el mismo payload | Siguiente carta |
| "Ya la vi" | `marked_seen` (opcional `reaction`: `loved`, `liked`, `not_for_me`) | Siguiente carta |
| Última carta | `deck_completed` con `deck_id` | `results[].closing`: `learned` (frase), `saved_posters`, `ready_tonight` |
| Por qué esta carta | — | `card.explanation`. Si `card.special_treatment`, darle tratamiento visual especial (sorpresa). Si viene `curator_name`, la eligió un curador |

### Ver (una propuesta para esta noche)

| Momento | Llamada | Qué mostrar |
|---|---|---|
| Entrar o cambiar filtro | `watchProposal({ max_runtime_min, vibe, company })` | Depende de `status` (abajo) |
| "Otra" | `postEvents([{ type: 'watch_skipped', movie_id }])` y otra vez `watchProposal()` | La siguiente |
| "Ver en Netflix" | `watch_started` con `payload.provider` | Abrir la plataforma |
| Al volver: "¿La viste?" | `watch_confirmed` con `reaction` (`loved`, `liked`, `not_for_me`) y `rewatch` opcional | Gracias |

| `status` | Qué hacer |
|---|---|
| `proposal` | Mostrar `card`. Si hay `notice`, mostrarlo (ya viene en palabras) |
| `suggest_discover` | Pidió "otra" tres veces seguidas: invitar a Descubrir con `notice` |
| `empty_platforms` | Nada de su mano está en sus plataformas: ofrecer `openDeck({ only_my_platforms: true })` |
| `empty_hand` | No ha guardado nada: llevar a Descubrir |

### Onboarding

1. `onboarding({ step: 'platforms', country: 'CO', providers: ['Netflix', 'Max'] })`.
2. `onboarding({ step: 'pairs', n: 6 })` → pares "¿Esta o esta?".
3. `onboarding({ step: 'choices', choices: [{ chosen_movie_id, rejected_movie_id }] })` → `profile.archetype` (la carta de perfil).

### Moods

Los moods son claves de `packages/config/data/vibes.json` (`llorar_bonito`, `apagar_cerebro`, `escapar`, `salir_pensando`, `solo_reirme`, `algo_raro`, `cine_del_bueno`). Muestra `name` y `definition`. El back también acepta los alias del prototipo (`sufrir`, `sentir`, `apagar`…).

## Paso 3 · Textos de la carta: el estándar de caracteres

Cada carta trae `display`, con los textos **ya recortados** para que nunca se salgan del borde. Úsalos en la carta; deja los campos completos (`back.overview`, `back.title`…) para una vista de detalle.

| Campo | Máximo | Dónde va | Si es más largo |
|---|---|---|---|
| `display.premise` | 44 caracteres | Frente: la premisa | Corta en una palabra y agrega "…" |
| `display.title` | 24 | Reverso: el título (el tamaño baja de 40 a 26 px según el largo) | Ídem |
| `display.subtitle` | 40 | Reverso: "Una película de…" | Deja el primer director y "y otros" |
| `display.overview` | 110 | Reverso: la sinopsis (3 líneas + "Ver más") | Termina en una frase completa o corta con "…" |
| `display.explanation` | 96 | Frente: la razón al pie (2 líneas) | Ídem |
| `display.pillars.*` | 15 | Frente y ficha ADN: ritmo, tono, historia, visual (1 línea) | Ídem |
| `display.dna_phrase` | 44 | Ficha ADN: "En una frase" | Ídem |
| `display.themes` | hasta 3 chips, 30 caracteres sumados | Ficha ADN: temas | Se quitan chips del final |

Los máximos están en `packages/config/data/params.json` (`card_*`, `watch_*`, `closing_*`). La tabla completa, pantalla por pantalla, está en [`limites-de-texto.md`](limites-de-texto.md). Si el diseño nuevo tiene otro tamaño de carta, cambia esos números; la función que recorta es `fitText()` de `@kinoo/shared`. La prueba `apps/web/e2e/cartas.spec.ts` revisa en el navegador que ningún texto de ninguna película se salga del borde. Si cambias el diseño de la carta, adapta esa prueba.

## Paso 4 · Pósters

Cada carta trae dos campos:

- `back.poster_url`: **úsalo siempre**. Es una URL lista para `<img src>`, sea de TMDB o un archivo del repositorio.
- `back.poster_path`: el dato crudo (`/abc.jpg` de TMDB o `posters/<id>.jpg` local). Solo para depurar.

Si `poster_url` es `null`, muestra el fondo de color del diseño, con el título. Los pósters son verticales (2:3 o 3:4); si el espacio de la carta es horizontal, encuádralos hacia arriba (`object-position: 50% 22%`), donde suelen ir las caras y el título. Para el modo demo, el motor arma las URL relativas a `kinoo-flujo/` (`../posters/<id>.jpg`). Un front nuevo que viva en otra carpeta pasa su propia base:

```ts
new KinooEngine(config, movies, { assetBaseUrl: '/Prototipo-Kinoo/' });
```

En el servidor, la variable es `KINOO_ASSET_BASE_URL`.

**Agregar o cambiar un póster:** guarda la imagen como `apps/web/public/posters/<id-de-la-película>.jpg`. El id está en `packages/catalog/data/posters.json`; por ejemplo, `the-godfather-1972`. Después corre:

```bash
npm run catalog:posters && npm run catalog:build && npm run db:seeds
```

Para optimizar una imagen grande (600 px de ancho, unos 70 KB):

```bash
python3 packages/catalog/scripts/optimize-poster.py ruta/al/poster.jpg the-godfather-1972
```

## Paso 5 · Comprobar

- [ ] La e2e del flujo principal pasa (`apps/web/e2e/motor.spec.ts` es el modelo a copiar): abrir mazo → guardar → Ver → "Me encantó" → el perfil cambió.
- [ ] Ninguna pantalla muestra números de afinidad. Busca `%` en el front.
- [ ] Ningún texto se sale de la carta: usa `display.*` y corre `cartas.spec.ts`.
- [ ] En PC se ve centrado (en la demo lo hace `public/_kinoo/kinoo-shell.css`).
- [ ] Las acciones llegan como eventos. Revísalo con `KinooDemo.events()` en la consola.
- [ ] Sin conexión al back, el front muestra un estado vacío decente.

## Ejemplo con números

Ana abre "Llorar bonito" con 10 cartas:

```ts
const deck = await kinoo.openDeck({ vibe: 'llorar_bonito', size: 10 });
// deck.cards[0] → { slot: 1, role: 'afin', movie_id: 'past-lives-2023',
//   front: { hook: 'DOS AMIGOS DE LA INFANCIA…', pillars: {…} },
//   back: { title: 'Vidas pasadas', poster_url: null, providers: ['Prime Video', 'Max'], … },
//   explanation: 'Responde a tu forma de llorar bonito: melancólicas e íntimas.' }
await kinoo.postEvents([{ type: 'saved_intent', movie_id: 'past-lives-2023', payload: { flipped: true, deck_id: deck.deck_id, slot: 1, vibe: 'llorar_bonito' } }]);
// → { accepted: 1, results: [{ id: '…', save: { special_match: false } }] }
```

Con `w = 0,4` y `η = 0,08`, su gusto por lo melancólico sube un poco (de 0,30 a 0,305). Si después confirma "Me encantó" en Ver, sube a 0,454. El front no calcula nada de eso: solo manda las dos acciones.
