# Especificación · pantalla Ver nueva (B7c)

**Para qué sirve esto.** Le dice al ingeniero de front cómo construir la nueva pantalla Ver (cartelera + selector de mood de una línea + ticket "Verla ahora" + repisa de ya vistas) sin adivinar: medidas, colores, estados, qué dato del puente `window.KinooDemo` llena cada texto, cuántos caracteres caben y qué partes del mockup no se llevan. La referencia es `docs/referencias/ver-b7c/Ver_Feed_IterB7c.dc.html` (todas las medidas salen de sus estilos en línea, revisadas en el navegador a 402 × 874).

Archivo destino recomendado: reemplazar el cuerpo de `apps/web/public/kinoo-flujo/FlujoV1_Feed.dc.html` (no renombrar la ruta: hay enlaces publicados).

Capturas de referencia: `img/12-b7c-cartelera.jpg`, `img/14-b7c-repisa.jpg`, `img/15-b7c-volver-a-ver.jpg`. La pantalla actual, para comparar: `img/07-ver-actual.jpg`, `img/09-ver-actual-hoja.jpg`.

---

## 1. Tokens que usa el diseño

El archivo de referencia declara las variables del sistema de diseño en `:root` (bloque `data-dc-design-system-vars`). Los estilos en línea usan los valores literales; conviene usar las variables.

| Uso | Token | Valor |
|---|---|---|
| Fondo de la pantalla | `--surface` | `#17120f` |
| Círculo grande de fondo | `--surface-sunk` | `#1e1713` (760 × 760, `left:-179 top:-50`) |
| Círculo chico de fondo | `--surface-raised` al 70 % | `rgba(34,26,21,.7)` (540 × 540, `left:-69 top:60`) |
| Texto principal | `--ink` | `#f4e7d0` |
| Texto secundario | `--ink-subtle` | `#bfa98a` |
| Texto apagado | `--line-strong` | `#8a7458` |
| Bordes finos | `--line` | `#3a2c22` |
| Oro (acento, frases en cursiva, punto activo) | `--sun` | `#f2b544` |
| Crema del ticket y barra inferior | `--surface-inverse` | `#f4e7d0` |
| Texto sobre crema | `--ink-inverse` / `--ink-inverse-muted` | `#1a1411` / `#6b5844` |
| Kicker del ticket | `--brand-ink-inverse` | `#a8401a` |
| Vino (talón del ticket, botón Ver activo) | — (no hay token) | `#5e0c10` |
| Puntos inactivos | — | `#5a4838` |
| Borde del avatar | — | `#ce7e01` |
| Borde punteado del talón | — | `#b8a27f` |
| Fondo de la carta sin imagen | — | `#0c0a09` |

Tipografías (Google Fonts, ya cargadas por las pantallas actuales):

- **Big Shoulders Display 900**, mayúsculas: marca, nombre del mood, título de la película, "VERLA AHORA", "TU REPISA".
- **Figtree**: 600 cursiva para frases en oro; 700/800 para metadatos y etiquetas.

Animaciones (bloque `<helmet><style>`): `kdeal` (0,55 s, entra la carta al cambiar de mood o de película), `kpop` (0,4 s, estrella), `kchev` (1,6 s infinito, flecha "↓"), `kin` (0,45 s, aviso), `kfade` (0,3 s, cabecera del modo "ya vistas"). Recomendación: respetar `prefers-reduced-motion` (quitar `kchev` y `kdeal`); el mockup no lo hace.

---

## 2. Estructura de arriba a abajo (modo cartelera)

Lienzo de 402 × 844. Todo vive en un contenedor con desplazamiento vertical (`.kscroll`, `overflow-y:auto`, `overscroll-behavior:contain`) cuyo contenido mide **1290 px** de alto. Dentro, una columna de 390 px a `left:6px`. Las coordenadas de abajo son relativas a esa columna (sumar 6 para la pantalla).

| # | Elemento | Posición y tamaño | Estilo | Dato |
|---|---|---|---|---|
| 1 | Marca "Kinoo" | `left:20 top:18` | Big Shoulders 900, 32/32, `letter-spacing:.3px` | fijo |
| 2 | Avatar "Tu perfil" | `left:326 top:14`, **44 × 44**, radio 22 | fondo `#221a15`, borde 2 px `#ce7e01`, ícono 22 px | enlace a Perfil (ver §9) |
| 3 | Frase "esta noche quiero algo para…" | centrada, `top:60` | Figtree 600 cursiva 15/20, `#f2b544` | fijo |
| 4 | Selector de mood | fila `left:20 right:20 top:82`, alto 40 | flechas ‹ › de **40 × 40** (radio 20, borde 1,5 px `#3a2c22`, 18 px); nombre en medio | `moods()[i].name` |
| 4a | Nombre del mood | centrado entre flechas | Big Shoulders 900, 32/34, mayúsculas, `white-space:nowrap`, subrayado 3 px `#f2b544`, `padding:0 4px` | `billboard().mood.name` |
| 5 | Descripción + puntos | fila centrada `top:132`, `gap:6px` | texto Figtree 600 12 px `#bfa98a` + 6 px de margen; puntos 5 × 5 (activo **14 × 5**) radio 3, `#f2b544` activo / `#5a4838` inactivo, `transition: width .25s` | `billboard().mood.desc`; un punto por elemento de `moods()` |
| 6 | Carta anterior (fantasma) | `left:-30 top:185`, 96 × 294, radio 14, borde 2 px `#3a2c22`, `opacity:.45`, `rotate(-4deg)` | póster `object-position:50% 0` | `films[idx-1]` |
| 7 | Carta siguiente (fantasma) | `left:324 top:185`, igual, `rotate(4deg)` | | `films[idx+1]` |
| 8 | Carta principal | `left:77 top:160`, **236 × 344**, radio 18, borde 3 px sólido `#f4e7d0`, fondo `#0c0a09`, sombra `0 18px 34px rgba(0,0,0,.6)`, `touch-action:pan-y` | póster a toda la carta, `object-fit:cover; object-position:50% 0` | `films[idx].poster_url` o carta de paleta |
| 8a | Estrella | dentro de la carta, `right:10 top:10`, **40 × 40**, radio 20, fondo `rgba(26,20,17,.8)` | ícono 20 px; vacío (trazo `currentColor`) o lleno `#f2b544` | `films[idx].starred` |
| 9 | Puntos de la cartelera | centrados, `top:514`, `gap:5px` | 6 × 6 (activo **18 × 6**), radio 3, `#f2b544` / `#5a4838` | `films.length` |
| 10 | Título | `left:20 right:20 top:530`, centrado | Big Shoulders 900, **38 px** (≤ 14 caracteres) o **30 px**, `line-height:1`, mayúsculas | `films[idx].title` |
| 11 | Meta | `margin-top:4` | Figtree 700 12 px `#bfa98a` | `films[idx].meta` |
| 12 | Frase "por qué hoy" | `margin-top:6` | Figtree 600 cursiva 15/19 `#f2b544`, entre comillas “ ” | `films[idx].quote` |
| 13 | Ticket "Verla ahora" | `left:20 top:650`, **350 × 88**, `filter: drop-shadow(0 10px 18px rgba(0,0,0,.45))` | ver §2.1 | `films[idx].providers[0]` |
| 14 | Enlace a la repisa | `top:741`, alto 16 | Figtree 800 11 px `#f2b544`, flecha "↓" con `kchev` | `shelf().length` |
| 15 | Barra inferior | fija, `top:760`, 402 × 84, fondo `#f4e7d0`, radio `26px 26px 0 0`, `z-index:5` | pastilla "Ver" activa 119 × 52 vino con borde 2 px `#1a1411`; "Descubrir" y "Comunidad" 92 × 52, Figtree 600 12 px `#6b5844`; indicador de inicio 134 × 5 | igual que hoy |

### 2.1 El ticket

- Parte izquierda (crema): `flex:1`, radio `16px 0 0 16px`, fondo `#f4e7d0`, `padding:12px 16px`, columna con `gap:2px`.
  - Kicker: Figtree 800 10 px, `letter-spacing:1.4px`, mayúsculas, `#a8401a` → "Tu plan · ahora".
  - Grande: Big Shoulders 900 28/28 mayúsculas `#1a1411` → "Verla ahora ↗" (o "Alquilarla ↗" si la plataforma es de alquiler).
  - Sub: Figtree 600 11,5 px `#6b5844` → "en {plataforma} · {nota}".
  - Dos muescas: círculos de 18 px color `#17120f` en `right:-9 top:-9` y `right:-9 bottom:-9`.
- Talón (vino): 88 px de ancho, `border-left: 2px dashed #b8a27f`, radio `0 16px 16px 0`, fondo `#5e0c10`, logo de la plataforma 48 × 48 (radio 12, borde 2 px `#f4e7d0`).
- En el mockup todo el ticket es un enlace directo a `Ver_Abriendo`. **En la implementación debe abrir la hoja de plataformas** (§4.4); el mockup B7c no trae la hoja.

### 2.2 La repisa (bajando)

| Elemento | Posición | Estilo | Dato |
|---|---|---|---|
| "volver a ver" | `left:26 top:872` (coordenadas de pantalla) | Figtree 600 cursiva 16/20 `#f2b544` | fijo |
| "TU REPISA" + contador | fila con `justify-content:space-between` | Big Shoulders 900 34/34; contador Figtree 700 11 px `#8a7458` | "{n} ya vistas" = `shelf().length` |
| Explicación | `margin-top:4` | Figtree 600 12/16 `#bfa98a` | fijo: "Cuando calificas una película, sale de la cartelera y se guarda aquí." |
| Fila de pósters | `top:968`, alto 230, desplazamiento horizontal, `gap:12px`, `padding:0 26px` | cada uno: botón 112 de ancho; póster **112 × 162**, radio 10, borde 2 px `#f4e7d0`, sombra `0 8px 14px rgba(0,0,0,.45)` | `shelf()[i]` |
| Tabla de la repisa | `left:14 right:14 top:166` (dentro de la fila), alto 10, radio 3, `#3a2c22`, sombra `0 6px 10px rgba(0,0,0,.4)` | decorativa | — |
| Título bajo el póster | `margin-top:16` | Big Shoulders 900 15/15 mayúsculas | `shelf()[i].title` |
| Calificación | | Figtree 700 10,5 px `#f2b544` | `shelf()[i].rating` |

El botón "↓ Tu repisa" hace `scrollTo({ top: 700, behavior: 'smooth' })` en el contenedor. El máximo desplazamiento real es 446 px (1290 − 844), así que el navegador lo deja en 446: la repisa queda entera sobre la barra inferior (comprobado: `img/14-b7c-repisa.jpg`).

---

## 3. Qué dato alimenta cada texto

| Texto en pantalla | Fuente | Límite (contrato) | Lo que cabe en el diseño (medido) | Propuesta |
|---|---|---|---|---|
| Nombre del mood | `billboard(m).mood.name` (o `moods()[i].name`) | 18 | Entre las flechas hay ~250 px. A 32 px: "APAGAR EL CEREBRO" (17) mide 234 px; 20 caracteres miden 269 px y no caben | **18**. Si pasa de 16, bajar a 28 px |
| Descripción del mood | `mood.desc` | 28 | A 12 px son ~5,8 px por carácter: 28 → ~160 px + 108 px de puntos = 268 de 390 | **28** |
| Título | `films[i].title` | `watch_title_max` = 24 | Ancho útil 350 px. El título real más ancho del catálogo a 24 caracteres, "WATCHMEN: LOS VIGILANTES", mide **315 px a 30 px** y 399 px a 38 px | **24**, 1 línea. 38 px hasta 14 caracteres; 30 px de 15 a 24. Ojo: hoy el back calcula `tsize` con otra regla (46/34/28, pensada para la carta vieja): para B7c debe ser 38/30 |
| Meta | `films[i].meta` | `watch_meta_max` = 44 | 1 línea de 350 px a 12 px ≈ 66 caracteres | **44**. Formato del diseño: "1 h 44 · Drama · Romance" (duración + hasta 2 géneros, sin director) |
| Frase | `films[i].quote` | `watch_why_max` = 80 | 2 líneas de ~50 caracteres a 15 px cursiva. Hay 58 px entre la frase (`top:592`) y el ticket (`top:650`): **3 líneas tocan el ticket** | **80** (2 líneas con comillas). Primera letra en mayúscula (hoy el puente la pasa a minúscula porque la vieja pantalla anteponía "Por qué hoy:") |
| Kicker del ticket | fijo | — | Área útil del ticket ≈ 230 px; a 10 px con espaciado, ~30 caracteres | Fijo: "Tu plan · ahora" / "Volver a verla · ahora" |
| Grande del ticket | `providers[0].rent` | — | 230 px a 28 px: "VERLA AHORA ↗" 165 px, "ALQUILARLA ↗" 149, "REPETIRLA ↗" 133; "ELEGIR DÓNDE VERLA ↗" (239) **no cabe** | Máximo **14** caracteres + flecha |
| Sub del ticket | `"en " + providers[0].name + " · " + providers[0].note` | `note` sin límite | 230 px a 11,5 px ≈ 44 caracteres ("en Prime Video · termina a las 11:48 p. m." = 211 px) | Sub ≤ **40**; `providers[].note` ≤ **22** (nuevo límite) |
| "la viste {when}" (modo ya vistas) | `shelf()[i].when` | 18 | La etiqueta va de `left:10` hasta la estrella (`right:10`, 40 px): ~176 px con 20 px de relleno. "la viste hace 3 semanas" mide 137 px; con `when` de 18 se pasa | **16** para `when` (bajar el 18 del contrato) |
| Calificación en la repisa | `shelf()[i].rating` | 16 | 112 px a 10,5 px: "¡Obra maestra!" mide 72 px | **16** |
| Título en la repisa | `shelf()[i].title` | (no está en el contrato) | 112 px a 15 px: los títulos de 24 caracteres miden ~158 px → 2 líneas; caben 2 líneas en los 230 px de la fila | **24** (2 líneas). Pedir al back que lo entregue ya recortado |
| Frase "volver a verla" | `shelf()[i].back` | 90 | Usa el mismo lugar que `quote` (2 líneas ≈ 96 con comillas) | **80**, igual que `quote` |
| Aviso (toast) | front, con datos del back | — | Caja de 350 px, 12,5 px, ~55 caracteres por línea | **60** (ya está en la guía) |
| Contador de la repisa | `shelf().length` | — | — | Es un conteo, no una afinidad: se permite |
| Aviso de estado | `billboard().notice` | (no tiene) | Usa la caja del estado vacío (§4.7) | **90** (nuevo) |

Todo límite nuevo (`providers.note`, `notice`, `shelf.title`, título de repisa, `when` = 16) va a `packages/config/data/params.json` y a la tabla de `docs/guias/limites-de-texto.md`, y sale recortado del back con `fitText()`.

---

## 4. Estados y transiciones

### 4.1 Entrada

1. `moods()` → lista con "Todas" primero. Mood inicial: el último que eligió la persona (`localStorage`, solo comodidad) o "Todas". El mockup arranca en "Sufrir bonito"; no copiarlo.
2. `billboard(moodKey)` → cartelera. Se muestra la película 0. La carta entra con `kdeal`.

### 4.2 Cambiar de mood

- Flechas ‹ › (40 × 40): mood anterior / siguiente, en círculo.
- Puntos: tocar un punto elige ese mood. **Problema:** miden 5 × 5 px; el área táctil debe ser ≥ 44 × 44 (ver §7).
- Al cambiar: `billboard(nuevo)`, índice a 0, la carta vuelve a entrar (`kdeal`), y aviso "{nombre} · {n} en cartelera" (2 s). Si `status` no es `ok`, en vez del aviso se muestra el estado vacío (§4.7).
- El front no reordena ni filtra: muestra `films` en el orden del back.

### 4.3 Pasar carta

- Deslizar horizontal > 50 px sobre la carta principal (eventos de puntero; `touch-action:pan-y` deja el desplazamiento vertical) o tocar las cartas fantasma.
- La lista es circular (después de la última vuelve la primera).
- Puntos de la cartelera: el activo crece a 18 px.
- **Evento:** pasar carta hoy en la pantalla actual manda `onWatch(id,'skip')`. Recomendación: en B7c, pasar carta **no** es un descarte (se puede volver con la flecha); mandar `skip` solo una vez por película y por visita, o no mandarlo. Esto es una decisión del equipo (P7.4/P7.5): anotarla.
- Si `films.length` es 1, ocultar las cartas fantasma y los puntos.
- Más de ~28 puntos no caben en 350 px: pedir al back un máximo de películas por mood (proponemos 10).

### 4.4 Tocar el ticket → hoja de plataformas

B7c no dibuja la hoja; se reutiliza la de la pantalla actual (`FlujoV1_Feed`, `img/09-ver-actual-hoja.jpg`):

- Velo: botón a pantalla completa `rgba(11,8,5,.66)`, `z-index:20`, entra y sale con opacidad en 300 ms. Tocar el velo cierra.
- Hoja: `top:333`, 402 × 511, fondo `#f4e7d0`, radio `28px 28px 0 0`, sombra `0 -10px 30px rgba(0,0,0,.4)`, entra con `translateY` 420 ms `cubic-bezier(.2,.9,.25,1.05)`. Agarradera 44 × 5 dentro de un botón "Cerrar" de 140 × 30.
- Encabezado: título de la película (Figtree 600 cursiva 18 px `#a8401a`) + "¿DÓNDE LA VES?" (Big Shoulders 900 36/33).
- Opciones: una fila por plataforma, 350 × 64, radio 16, logo 44 × 44, nombre Figtree 700 15 px, nota Figtree 600 12 px (verde `#2f6b4f` si está incluida, `#8e6f62` si es alquiler), radio de selección 22 px. Seleccionada: borde 2 px `#e8642c`, fondo `#fff7ea`.
- Botón principal: 350 × 58, vino, borde 2 px crema, Big Shoulders 900 22 px: "Abrir en {plataforma} ↗" o "Alquilar en {plataforma}".
- Nota al pie: "Kinoo no reproduce: te lleva a la app donde ya tienes la película." y debajo la atribución (§6).
- **Datos:** las filas salen de `films[i].providers` (ya ordenadas por el back: primero las de la persona). **Hoy la hoja muestra siempre las 4 plataformas fijas** aunque la película solo esté en una (comprobado con Matrix, que solo está en Max); eso no se lleva.
- Al confirmar: `onWatch(id, 'start', provider.name)` y navegar a `FlujoV2_Abriendo.dc.html`.
- El precio "$14.900" del mockup es inventado: si no hay precio en los datos, la nota dice "alquiler" a secas.

### 4.5 Estrella

- Botón 40 × 40 dentro de la carta. Al tocar: `star(id, !starred)`, animación `kpop`, ícono lleno/vacío, aviso.
- `e.stopPropagation()` para que no cuente como toque de carta.
- El mockup la llama "Para después" (aria-label y aviso "{título} queda para después"). Con el evento `super_liked` (P7.3, opción a: "la quiero ver sí o sí") el texto debe decir eso. Propuesta: aria-label "Marcar con estrella" / "Quitar estrella"; aviso "{título} queda primera en tu cartelera" (≤ 60) y "Le quitamos la estrella a {título}".
- Tras marcar, ¿la película sube al primer lugar en el momento? Recomendación: no mover la carta que la persona está mirando; el nuevo orden se ve la próxima vez que se pida `billboard`.

### 4.6 Repisa y modo "volver a ver"

- Bajar (desplazamiento o botón "↓ Tu repisa") muestra la repisa.
- Tocar un póster de la repisa: modo "ya vistas" con esa película, y sube la vista (`scrollTo top 0`).
- En modo "ya vistas":
  - La cabecera cambia (con `kfade`): "volver a ver" (Figtree 600 cursiva 15/18 oro) + "LAS QUE YA VISTE" (Big Shoulders 900 28/28) a la izquierda, y botón "← Nuevas" a la derecha (30 de alto, radio 15, borde 1,5 px `#5a4838`, Figtree 800 12 px `#d9c7a8`). El botón mide 84 × 30: subir a 44 de alto.
  - La cartelera pasa a ser `shelf()`.
  - Etiqueta en la carta: "la viste {when}" (26 de alto, radio 13, fondo `rgba(26,20,17,.85)`, borde 1,5 px oro, Figtree 600 cursiva 12,5 px). **Error del mockup:** se ve "la vistehace 3 semanas" (sin espacio); el espacio debe ir dentro de la plantilla.
  - Meta: "{duración} · tu calificación: {rating}". `shelf()` no trae duración: pedirla (ver §8) o mostrar solo "tu calificación: {rating}".
  - Frase: `shelf()[i].back`.
  - Ticket: kicker "Volver a verla · ahora", grande "Repetirla ↗". Al confirmar plataforma: `rewatch(id)` y luego `onWatch(id,'start',provider)`.
- "← Nuevas" vuelve a la cartelera del último mood.
- La variante "comodín" del mockup ("¿O repetimos una?", carta punteada) está apagada en la versión c (`'c' === 'b'`): no se construye.

### 4.7 Estados vacíos

Ninguno está dibujado en B7c. Propuesta común: en el lugar de la carta (236 × 344, mismo borde pero **punteado** 3 px `#5a4838`, fondo `#1e1713`), un texto centrado (Big Shoulders 900 26 px + Figtree 600 13/18 `#bfa98a`) y un botón de 44 px de alto. El ticket se oculta. El selector de mood y la repisa siguen.

| `status` | Cuándo | Título (≤ 22) | Texto (`notice`, ≤ 90) | Botón |
|---|---|---|---|---|
| `empty_hand` | No guardó nada en Descubrir | "Tu cartelera está vacía" | "Guarda películas en Descubrir y aquí te proponemos cuál ver esta noche." | "Ir a Descubrir" → `Flujo1_Descubrir.dc.html` |
| `empty_mood` | Tiene películas, pero ninguna para este mood | "Nada para este mood" | Del back, p. ej. "Ninguna de tus guardadas va con Algo raro. Prueba Todas o descubre más." | "Ver todas" (cambia a "todas") |
| `empty_platforms` | Hay películas, pero ninguna en sus plataformas | "No está en tus plataformas" | Del back. | Si hay alquiler, mostrar la carta igual con "Alquilarla ↗"; si no, "Ir a Descubrir" |
| Repisa vacía | `shelf()` vacío | — | Ocultar el enlace "↓ Tu repisa" y, abajo, "Cuando califiques una película, aparece aquí." | — |

**Hoy, con la mano vacía, la pantalla actual muestra la película de ejemplo con "93 % contigo"** (comprobado tras `KinooDemo.reset()`, `img/16-ver-actual-sin-mano.jpg`). Esto debe desaparecer: con `empty_hand` nunca se muestran datos de ejemplo.

### 4.8 Aviso (toast)

`role="status"`, `left:26 right:26 top:96` (cubre el selector de mood mientras dura), `z-index:30`, `padding:10px 14px`, radio 14, fondo `#1a1411`, borde 1,5 px `#f2b544`, sombra `0 10px 24px rgba(0,0,0,.45)`, Figtree 600 12,5/17 centrado, entra con `kin`, dura 2 s. Máximo 60 caracteres.

---

## 5. Lo que NO se lleva del mockup

| Del mockup | Por qué | Qué va en su lugar |
|---|---|---|
| `match: 93` y cualquier número de afinidad | Regla del producto: nunca números ni % de afinidad | Nada. El orden de la cartelera ya lo dice |
| "es tu match más alto…" en `why` | Habla de "match" como cifra | `quote` del back, en palabras |
| "termina a las 7:11 a. m." | El mockup lo calcula con la hora del teléfono + duración. Solo es cierto si empieza ahora y no hay pausas; si no hay `runtime_min`, inventa 120 min | Si `runtime_min` existe se puede dejar como "termina cerca de las 11:40 p. m.", calculado en el front (es formato de hora, no algoritmo). Si no hay dato, `providers[0].note` ("en tu suscripción"). Recomendación: usar `note` y dejar la hora para después |
| "alquiler · $14.900" | Precio inventado | `note` del back sin precio |
| Datos fijos (`FILMS`, `MOODS`, `SEEN`, `PLATS`) | Son de ejemplo | `billboard`, `moods`, `shelf` |
| 9 moods con "Sufrir bonito" **y** "Sentir algo" | En `vibes.json` hay 7 moods; "sufrir" y "sentir" apuntan los dos a `llorar_bonito`, y "Sufrir bonito" se llama "Llorar bonito" en la configuración | `moods()` del back: "Todas" + los 7 |
| Rutas `Ver_Abriendo.dc.html`, `App_Perfil.dc.html`, `App_Main.dc.html`, `Ver_Feed.dc.html` | No existen en el prototipo | `FlujoV2_Abriendo`, Perfil (§9), `Flujo1_Descubrir`, `FlujoV1_Feed` |
| Carta "comodín" | Apagada en la versión c | — |
| Aria-label "Para después" en la estrella | Contradice `super_liked` | §4.5 |

---

## 6. Atribución de TMDB

- Hoy el puente agrega un párrafo **fijo en el borde inferior de la ventana** (`position:fixed; bottom:0; z-index:9999`, 9 px) solo si `catalog.source === 'tmdb'`. En la demo la fuente es `tmdb_simulado`, así que **hoy no se ve en ninguna pantalla** (comprobado). Además, a 9 px y encima de la barra inferior, quedaría tapando el indicador de inicio y sería ilegible.
- Propuesta para B7c:
  1. **Al final de la repisa** (dentro del contenido desplazable, debajo de la fila de pósters, `top ≈ 1210`): "Datos de películas: TMDB. Plataformas: JustWatch." Figtree 600 10,5 px `#8a7458`, centrado, con el logo de TMDB si se consigue. El texto largo de la licencia ("Este producto usa la API de TMDB…") puede ir en Perfil.
  2. **En la hoja de plataformas**, bajo la nota: "Disponibilidad: JustWatch vía TMDB." (P7.6 lo pide).
  3. Quitar el párrafo fijo del puente en las pantallas que ya lo muestren en su lugar (lo decide el back/front).
- No pude comprobar cómo se ve con `source === 'tmdb'` porque la demo no usa ese catálogo.

---

## 7. Accesibilidad

| Elemento | Hoy en B7c | Ajuste |
|---|---|---|
| Puntos de mood | 5 × 5 px, aria-label "Elegir mood" (todos iguales) | Área táctil 44 × 44 (relleno transparente) o quitarlos como botones y dejarlos solo de adorno (`aria-hidden`) — las flechas ya cumplen la función. Si se quedan: aria-label "Elegir {nombre}" y `aria-current` en el activo |
| Flechas ‹ › | 40 × 40 | Subir a 44 × 44 |
| Estrella | 40 × 40 | 44 × 44; `aria-pressed` |
| "← Nuevas" | 84 × 30 | 44 de alto |
| "↓ Tu repisa" | 390 × 16 | 44 de alto (relleno) |
| Ticket | 350 × 88, es un `<a>` sin texto alternativo para el logo | Botón con nombre "Verla ahora en {plataforma}" |
| Carta principal | `div` con eventos de puntero | Las cartas fantasma ya son botones "Anterior"/"Siguiente": darles nombre "Anterior: {título}" |
| Contraste | Oro sobre fondo 10,2:1; `#bfa98a` 8,2:1; `#6b5844` sobre crema 5,5:1; `#a8401a` sobre crema 5,0:1; `#8a7458` sobre fondo **4,2:1** (texto de 11 px: no llega a 4,5); punto inactivo `#5a4838` **2,1:1**; borde de flechas `#3a2c22` **1,4:1** | Contador "{n} ya vistas" a `#bfa98a`; punto inactivo a `#8a7458` (3:1 mínimo para elementos gráficos); borde de flechas a `#5a4838` o más claro |
| Foco | No hay estilo de foco (la regla `button{…}` borra el borde y el navegador usa su contorno por defecto, casi invisible sobre el fondo) | `:focus-visible { outline: 2px solid var(--focus); outline-offset: 2px }` |
| Movimiento | Sin `prefers-reduced-motion` | Ver §1 |
| Atajo de teclado | No hay | ← → cambian de película; no es obligatorio |

---

## 8. Bloque "lo que aprendimos de ti" en Ver

Hoy está en `FlujoV1_Feed` como una carta que aparece **en la posición 4 del mazo de Ver** con "SUFRIDOR BONITO", "7 de tus últimos 10 likes…" y barras con "70 % / 20 % / 10 %" (`img/08-ver-actual-aprendimos.jpg`). Todo es fijo (no cambia con los swipes) y rompe la regla de no mostrar números.

**Dónde va en B7c:** como sección propia **entre la repisa y la atribución**, al bajar (no como carta de la cartelera: B7c es una cartelera de películas y mezclar otra cosa confunde el pasar carta). El contenido sube de 1290 a ~1530 px de alto.

Si la persona no tiene repisa todavía, la sección va justo después del enlace "↓", y el enlace dice "↓ Lo que aprendimos de ti".

Medidas propuestas (mismo lenguaje que la repisa):

| Elemento | Estilo | Dato |
|---|---|---|
| Kicker | Figtree 600 cursiva 16/20 `#f2b544`, `left:26` | `insight().kicker` (≤ 28) |
| Título | Big Shoulders 900 30/30 mayúsculas, 1 línea en 350 px | `insight().title` (≤ 24) |
| Frase | Figtree 600 13/18 `#d9c7a8`, hasta 3 líneas | `insight().body` (≤ 110) |
| Filas de mood (hasta 3) | rejilla `120px 1fr 64px`, 28 px de alto cada una, `gap:8px`; nombre Big Shoulders 900 13 px mayúsculas | `insight().moods[i].name` + `level` |
| Rasgos (hasta 3) | chips de 28 px de alto, radio 14, borde 1,5 px `#5a4838`, Figtree 700 12 px | `insight().traits[i].label` (≤ 16) + `level` |
| Vacío | Si `ready` es false: solo kicker y `empty_text` (≤ 90), sin barras | `insight().empty_text` |

**Cómo se ve el nivel sin cifras:** barra de **3 segmentos** iguales (cada uno 18 × 7 px, radio 4, separados 4 px) más una palabra:

| `level` | Segmentos llenos | Color lleno | Palabra al lado (Figtree 700 11 px `#bfa98a`) |
|---|---|---|---|
| `alto` | ●●● | `#f2b544` | "mucho" |
| `medio` | ●●○ | `#f2b544` | "bastante" |
| `bajo` | ●○○ | `#f2b544` | "un poco" |

Los segmentos vacíos van en `rgba(244,231,208,.18)` (como el fondo de la barra actual). La palabra hace que no dependa solo del color ni de contar segmentos. Para lectores de pantalla: `aria-label="Llorar bonito: mucho"` en la fila y los segmentos con `aria-hidden`. En los chips de rasgos, el nivel se muestra con el mismo trío de puntos chicos (5 px) dentro del chip.

Lo mismo sirve para Resumen y Perfil (ver `ux-ui.md`). No se muestran porcentajes, ni "7 de 10", ni barras de largo continuo (una barra continua es un porcentaje dibujado).

"Compartir" del bloque actual: no se lleva hasta que exista algo que compartir de verdad (hoy solo muestra un aviso falso "Link copiado").

---

## 9. Enlaces

| Desde | A | Estado hoy |
|---|---|---|
| Avatar "Tu perfil" | `Flujo2c_Perfil.dc.html` | En la pantalla actual el `<a>` **no tiene href** (no hace nada) |
| Barra: Ver | `FlujoV1_Feed.dc.html` | ok |
| Barra: Descubrir | `Flujo1_Descubrir.dc.html` | ok |
| Barra: Comunidad | Sin destino (es un `div`) | Marcar como "pronto" o atenuar (opacidad .5) para que no parezca roto |
| Ticket → hoja → confirmar | `FlujoV2_Abriendo.dc.html` | ok en la actual |
| "Filtros" (pantalla actual) | Sin destino | B7c no lo tiene: no se lleva |

---

## 10. Lo que falta en el contrato del puente

1. `billboard().films[]` no trae `starred` de la repisa ni datos para el modo "ya vistas": `shelf()` no trae `meta`/duración ni `providers`. Sin `providers` no se puede armar el ticket "Repetirla" ni la hoja. **Pedir `shelf()[i].providers` y `shelf()[i].meta`.**
2. `providers[].note` no tiene límite (proponemos 22) ni dice si es "en tu suscripción" o "alquiler". Falta `logo` (o una clave estable `key` para buscar el logo en el front).
3. No hay tamaño de título para B7c (`title_size` 38/30) — o el front lo calcula con la regla de §3. El `tsize` actual sigue la regla vieja (46/34/28).
4. `billboard().mood` para "todas" necesita `name` y `desc` también (p. ej. "Todas" / "Un poco de todo").
5. No hay un máximo de películas por cartelera (los puntos dejan de caber pasado ~28).
6. `notice` y `shelf().title` no tienen límite en el contrato.
7. `star()` no devuelve nada: el front no sabe si funcionó. Proponer que devuelva `{ starred: boolean }`.
8. No hay forma de saber el mood elegido la última vez (si se quiere recordar entre visitas, el front lo guarda en `localStorage`).
9. Sin `logo` de TMDB/JustWatch en los recursos.

---

## Ejemplo con números

Camilo guardó 5 películas en Descubrir y calificó *Coco* con "¡Me encantó!". Abre Ver en "Todas":

- `moods()` devuelve 8 elementos (Todas + 7): se dibujan 8 puntos, el primero de 14 px y los otros de 5 px; fila total ≈ 14 + 7 × 5 + 7 × 6 = 91 px, más la descripción "Un poco de todo" (15 caracteres ≈ 87 px).
- `billboard('todas')` devuelve 4 películas (*Coco* ya no está: pasó a la repisa). Puntos de la cartelera: 18 + 3 × 6 + 3 × 5 = 51 px.
- Primera: "Matrix" (6 caracteres → 38 px). Meta "2 h 16 · Acción · Ciencia ficción" (32 de 44). Frase "Encaja con tu gusto por historias épicas y de neón." (51 de 80 → 2 líneas, 38 px de alto: termina en `top` 592 + 38 = 630, antes del ticket en 650).
- Ticket: `providers[0]` = Max, `note` "en tu suscripción" → "en Max · en tu suscripción" (26 de 40).
- Pasa a la segunda: "Avengers: Endgame" (17 caracteres → 30 px, mide ~233 px de los 350).
- Baja: "TU REPISA · 1 ya vistas" con *Coco* y "¡Me encantó!" (12 de 16).
- Debajo, `insight()`: título "ERES TODO UN EXPLORADOR" (23 de 24), y filas "ESCAPAR UN RATO ●●● mucho", "APAGAR EL CEREBRO ●●○ bastante", "SALIR PENSANDO ●○○ un poco". Ningún número.
- Si Camilo hubiera borrado todo (`reset`), `billboard` respondería `status: 'empty_hand'`, y la carta punteada diría "Tu cartelera está vacía" con el botón "Ir a Descubrir", en vez del "93 % contigo" de ejemplo que sale hoy.
