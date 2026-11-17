# Auditoría UX-UI de Kinoo

**Para qué sirve esto.** Revisa las 14 pantallas del prototipo (`entrar.html` y las 13 de `apps/web/public/kinoo-flujo/`): qué hace cada una, si está conectada al motor o es un mockup, qué problemas tiene y qué hacer. Termina con una lista priorizada de cambios. Sirve al front para saber qué arreglar primero y al back para saber qué datos faltan.

## Cómo se revisó

- Prototipo compilado (`npm run build -w @kinoo/web`) y servido en `http://localhost:4173/Prototipo-Kinoo/`, con Chromium (Playwright) a **402 × 874**, sesión `camilo` / `1234`.
- Recorrido: entrar → Descubrir (5 "Quiero verla" y 5 "No me interesa") → cierre del mazo → cada pantalla por su URL → Ver (pasar cartas, carta "lo que aprendimos", hoja de plataformas) → `KinooDemo.reset()` y Ver otra vez (mano vacía).
- En cada pantalla un script midió: botones visibles de menos de 44 × 44 px, textos que se salen de su caja, textos de menos de 11 px, porcentajes o "/100" en el texto visible, enlaces `<a>` sin destino, y si la pantalla carga el puente `KinooDemo`. También se tocó cada botón principal para ver si navega.
- Contraste calculado con la fórmula WCAG sobre los colores del código.
- Capturas en `docs/auditoria/img/`.

**Lo que no se pudo comprobar:** cómo se ve la atribución de TMDB con el catálogo real (la demo usa `tmdb_simulado` y no la muestra), el modo Supabase (solo se probó el modo demo), lectores de pantalla reales, y teléfonos reales. "Calificar la película →" en Función no se pudo tocar en la prueba (aparece al final de la animación; no esperé a que terminara).

## Resumen en una tabla

| Pantalla | ¿Conectada? | Lo más grave |
|---|---|---|
| `entrar.html` | Sí (sesión) | Nada grave |
| `Flujo1_Descubrir` | **Sí** (motor) | Si el puente no carga, sale "93 % contigo" de ejemplo |
| `Flujo2_Resumen` | **No** (mockup) | Porcentajes; contradice el cierre real del mazo; no pide sesión |
| `Flujo2b_Ticket` | No | Texto fijo "Lentas y melancólicas"; "Compartir recibo" no hace nada |
| `Flujo2c_Perfil` | No | "82/100", "40 %"… |
| `Flujo3_Minijuego` | No | No guarda la respuesta |
| `Flujo4_Eleccion` | No | Mazos fijos; "Mejor ver algo ahora" no navega |
| `Flujo5_Inicio` | No | Mazo fijo; "Mejor ver algo ahora" no navega |
| `FlujoV1_Feed` (Ver) | **Sí, a medias** | "93 % contigo" con la mano vacía; carta "70 % / 20 % / 10 %"; hoja con plataformas falsas |
| `FlujoV2_Abriendo` | No | Dice "Netflix" aunque elijas Max |
| `FlujoV3_Funcion` | No | "41 % igual"; tiempo límite de 7 s |
| `FlujoV4_Calificar` | **Sí** (`confirmWatch`) | Si no hay película en curso, no avisa |
| `FlujoV5_Version` | No | Etiquetas de 7,5 px; la elección no se guarda |
| `FlujoV6_Gracias` | No | Todo fijo ("Sufrí bonito", "Netflix", "3 de 3") |

Problemas comunes a casi todas:

- **Franja blanca abajo** (media): las pantallas miden 844 px de alto; en un teléfono de 874 px (o más) queda una franja blanca bajo la barra inferior (se ve en todas las capturas). `kinoo-shell.css` solo pinta el fondo en pantallas de 600 px o más. Arreglo: `html, body { background: #17120f }` para todos los anchos.
- **Foco invisible** (media): la regla `button{…border:0…}` y el contorno por defecto del navegador (1 px oscuro) hacen que con teclado no se vea dónde estás (comprobado en Descubrir). Arreglo global: `:focus-visible { outline: 2px solid #f2b544; outline-offset: 2px }`.
- **Avatar "Tu perfil" sin destino** (media): en Ver, Calificar, Versión y Gracias el `<a>` no tiene `href`. Debe ir a `Flujo2c_Perfil.dc.html`.
- **"Comunidad" en la barra** (baja): es un `div` sin destino en todas; parece roto. Atenuarlo o poner "pronto".
- **Imágenes con plantilla sin resolver** (baja): el navegador pide `{{card.img}}`, `{{u.img}}`, `{{o.logo}}`… antes de que el motor de plantillas las reemplace (10 errores 404 por recorrido). No se ve, pero ensucia la consola y las pruebas. Lo mismo pasa en la referencia B7c.

---

## Pantalla por pantalla

### `entrar.html` · Entrar

- **Qué hace:** inicio de sesión de la demo. Si ya hay sesión, ofrece "Seguir" o "Salir y cambiar de usuario". Las pantallas con puente (Descubrir, Ver, Calificar) mandan aquí si no hay sesión, con `?next=`.
- **Conectada:** sí, a `session.ts`.
- **Problemas:**
  - (baja) El error "Usuario o clave incorrectos." usa `#e8642c` sobre vino `#5e0c10`; no medí ese par, pero el naranja sobre vino oscuro suele quedar justo. Revisar.
  - (baja) El foco del campo es un cambio de color del borde (`--oro`): está bien. El del botón es el contorno por defecto.
- **Bien:** etiquetas reales (`<label for>`), `autocomplete`, botón de 56 px, la nota explica que los datos quedan en el navegador.

### `Flujo1_Descubrir` · Descubrir (`img/02-descubrir.jpg`, `img/03-descubrir-fin.jpg`)

- **Qué hace:** mazo de 10 cartas; frente con premisa y pilares, reverso con póster y sinopsis, ficha ADN; acciones "Quiero verla", "No me interesa", "Ya la vi"; cierre del mazo con la frase de lo aprendido, abanico de las guardadas y conteos.
- **Conectada:** sí (`discoverCards`, `onCard`, `closingLine`). El cierre mostró "Hoy te inclinaste por historias épicas y de neón." y "5 quieres ver · 0 ya la viste · 5 dejaste pasar", que coincide con lo que hice.
- **Problemas:**
  - (media) Los datos de ejemplo del archivo tienen `match: 93` y la plantilla tiene el bloque "% contigo" con `showMatch`. Con el puente cargado no se ve, pero si `kinoo-demo.js` falla, la pantalla muestra porcentajes. Borrar el bloque y los `match` del archivo.
  - (media) Los 4 botones "i" de los pilares miden **33 × 33** y su "i" es de 9,5 px; las etiquetas Ritmo/Tono/Historia/Visual son de 10 px.
  - (baja) "Repetir el mazo" mide 99 × 30.
  - (media) "Ver cómo te fue" lleva a Resumen, que **muestra otros números** (4 / 1 / 5, de ejemplo) que los del cierre real (5 / 0 / 5). La persona ve dos versiones de su propia sesión.
  - (baja) En el abanico del cierre, las cartas sin póster muestran el título cortado ("EL PADRI…", "AVENGER…"): la guía dice que es a propósito.
- **Sobre la persona:** la frase del cierre sí sale de sus swipes (`closing_text_max` 80). Bien.

### `Flujo2_Resumen` · Resumen del mazo (`img/04-resumen.jpg`)

- **Qué hace:** "Mazo terminado", "Diario de una sesión", tema "Amor melancólico", conteos, enlace al Ticket y "Afinidades de tus elecciones" con barras.
- **Conectada:** **no**. No carga `kinoo-demo.js`; ni siquiera pide sesión (abre sin haber entrado).
- **Problemas:**
  - (**alta**) "100 %", "80 %", "60 %" en "Afinidades de tus elecciones". Prohibido.
  - (**alta**) Todo es fijo: "Amor melancólico", "En tus 5 elecciones se repiten amores a destiempo…", "4 quieres ver / 1 ya la viste / 5 dejaste pasar". No coincide con el mazo que la persona acaba de jugar.
  - (media) "Ir a Ver · 3 listas para hoy" parece un enlace pero es un `div`: **no navega** (comprobado). El número "3" es inventado.
  - (media) "Volver" mide 33 × 44.
  - (baja) "DIARIO DE UNA SESIÓN" a 10 px.
  - (baja) La nota "Ejemplo ilustrativo · no son datos reales" queda al final de 1163 px de desplazamiento: pocos llegan.
- **Qué debería decir sobre la persona:** `insight()` → `title`, `body` (en lugar de "En tus 5 elecciones…"), `moods` y `traits` con niveles en palabras y barras de 3 segmentos (ver `especificacion-ver-b7c.md` §8) en lugar de los porcentajes. Los conteos deben salir del mazo real (`lastClosing()`). "Ir a Ver" → `FlujoV1_Feed.dc.html`, con el número real de películas en la cartelera o sin número.

### `Flujo2b_Ticket` · Ticket del mazo

- **Qué hace:** un "recibo" del mazo: "Lentas y melancólicas", "Hoy te movieron las historias grandes y serias.", 3 / 1 / ✕ 6, "Compartir recibo".
- **Conectada:** no.
- **Problemas:**
  - (**alta**) El texto sobre la persona es fijo y los conteos (3 / 1 / 6) no coinciden ni con Resumen (4 / 1 / 5) ni con el cierre real.
  - (media) "Compartir recibo" no hace nada (es un `div`).
  - (media) "Volver al cierre" mide 33 × 44.
  - (baja) "TICKET DEL MAZO" a 10 px.
- **Qué debería decir:** el nombre del mood del mazo, `closingLine()` o `insight().body`, y los conteos de `lastClosing()`. Sin "Compartir" hasta que exista.

### `Flujo2c_Perfil` · Tu perfil (`img/06-perfil.jpg`)

- **Qué hace:** retrato "Soñador de pantalla", anillo con "Curiosidad 82/100", "41 de 50 películas…", "Lo que te atrapa" con 4 motivos y porcentajes.
- **Conectada:** no. Dice "Retrato · Demo" y "Ejemplo conceptual con elecciones ficticias…".
- **Problemas:**
  - (**alta**) "82 /100", "82/100 en curiosidad", "40 %", "30 %", "20 %", "10 %", "100 % de las elecciones". Prohibido.
  - (**alta**) El anillo de colores es un gráfico de porcentajes (los arcos son proporcionales). Aunque se quiten las cifras, la forma sigue diciendo "40 %".
  - (media) "Volver" 33 × 44. "RETRATO · DEMO" y "CURIOSIDAD" a 10 px.
  - (media) Es la pantalla a la que debería ir el avatar desde todas las demás, pero nadie enlaza aquí salvo Resumen.
  - (baja) "Soñador de pantalla" no es uno de los 5 arquetipos de `archetypes.json` (Explorador, Observador, Romántico, Nocturno, Luminoso).
- **Qué debería decir:** `insight().archetype.name` como título, `insight().body`, y "Lo que te atrapa" con `traits` y `moods` en filas con nivel en palabras (alto → "mucho", medio → "bastante", bajo → "un poco") y barra de 3 segmentos. Quitar el anillo o volverlo decorativo sin proporciones. El texto legal de TMDB completo puede ir al pie de esta pantalla.

### `Flujo3_Minijuego` · ¿Esto o aquello?

- **Qué hace:** pregunta rápida de 10 s ("Hacerte amigo de una roca" vs "Sudar en un laboratorio"), con aviso de entrada.
- **Conectada:** no; la respuesta no se guarda en ningún lado.
- **Problemas:**
  - (media) "Omitir" mide 39 × 15.
  - (media) Tiempo límite de 10 s sin forma de pedir más (pauta WCAG 2.2.1). Al ser un juego se acepta, pero debe poder omitirse con un botón grande.
  - (baja) "Volver" 33 × 44. Chip "FIN DEL MAZO" arriba, que aquí no corresponde.
  - (media) Si la respuesta no se guarda, la frase "Nos dice qué tipo de historia te mueve" promete algo que no pasa. Decidir si genera un evento (está fuera del brief; no hay pregunta abierta en `PREGUNTAS` que lo cubra, que yo viera).

### `Flujo4_Eleccion` · Tu próximo mazo

- **Qué hace:** tres mazos para elegir (Mood "Lentas y melancólicas", Hilo "Sigue a Christopher Nolan", Creadores "Lo que guardaron Ana y Leo").
- **Conectada:** no. Los tres mazos son fijos.
- **Problemas:**
  - (**alta**) "Sigue a Christopher Nolan · porque marcaste Interstellar" es un dato sobre la persona inventado (Camilo nunca marcó Interstellar en esta prueba). "Ana y Leo" son personas inexistentes.
  - (media) "Mejor ver algo ahora" no navega (comprobado). Debe ir a Ver.
  - (baja) Las etiquetas "Mood · 10 cartas" son de 10 px. "Elige un mazo" es un botón atenuado hasta elegir: está bien, pero no dice por qué está apagado.
- **Recomendación:** que el back proponga los mazos (`deck_recipes.json` ya tiene recetas); mientras tanto, dejar solo el de mood con el nombre real.

### `Flujo5_Inicio` · Tu mazo está listo

- **Qué hace:** presenta el próximo mazo ("Lentas y melancólicas · 10 cartas · y una de ellas es especial") y lleva a Descubrir.
- **Conectada:** no.
- **Problemas:** (media) "Mejor ver algo ahora" no navega. (baja) Nombre del mazo fijo. Chip "FIN DEL MAZO" fuera de lugar.

### `FlujoV1_Feed` · Ver, versión actual (`img/07-ver-actual.jpg`, `img/08-ver-actual-aprendimos.jpg`, `img/09-ver-actual-hoja.jpg`, `img/16-ver-actual-sin-mano.jpg`)

- **Qué hace:** carrusel de 9 moods, carta grande para deslizar (→ verla, ← otra, ↑ super like), carta "lo que aprendimos de ti" en la posición 4, hoja "¿Dónde la ves?", hoja "Tus super likes", fin del mazo.
- **Conectada:** a medias. Usa `watchQueue()` para el orden y la frase "por qué hoy", `onWatch` para pasar e iniciar. Todo lo demás es fijo.
- **Problemas:**
  - (**alta**) Con la mano vacía (`reset()`) muestra Interstellar con **"93 % contigo"** y "es tu match más alto y la guardaste en el último mazo de Nolan". Datos de ejemplo presentados como si fueran de la persona.
  - (**alta**) Carta "lo que aprendimos de ti": "ERES TODO UN SUFRIDOR BONITO", "7 de tus últimos 10 likes…", "70 % / 20 % / 10 %". Fija y con porcentajes.
  - (**alta**) La hoja "¿Dónde la ves?" muestra siempre Netflix, Prime Video, Max y Apple TV ("Alquiler · $14.900"), aunque Matrix solo esté en Max. El precio es inventado.
  - (**alta**) Super likes: el contador arranca en 7 y la lista trae 7 películas de ejemplo; no hay evento `super_liked` (P7.3). "Jugar mi mazo de super likes" juega películas que la persona no marcó.
  - (media) Chip "de tu mano" donde iba el porcentaje: no aporta.
  - (media) Duración mal formateada: "3 h 1" (Avengers: Endgame, 181 min). `fmtDur` en `apps/web/src/demo.ts` no rellena con cero: debe ser "3 h 01".
  - (media) Botones chicos: "Filtros" 79 × 30 (y no hace nada), "En tu lista" 97 × 30, "← otra" 64 × 28, "verla →" 69 × 28, chip de plataforma "Max" 43 × 26, agarradera de la hoja 140 × 30.
  - (media) "Filtros" y el avatar no tienen destino.
  - (media) "Sufrir bonito" y "Sentir algo" son dos moods en pantalla pero el mismo en el motor (`llorar_bonito`): dan el mismo orden. En la configuración se llama "Llorar bonito".
  - (baja) En el fin del mazo: "Tus mazos" y "Sorpréndeme" son `<a>` sin destino. "Tu match del mazo" usa la palabra "match".
  - (baja) "Compartir" en la carta del título solo muestra "Link copiado" sin copiar nada.
  - (baja) La nota de la hoja ("Kinoo no reproduce…") es de 10,5 px y `#8e6f62` sobre crema (3,7:1, bajo 4,5).
- **Recomendación:** reemplazar por B7c según `especificacion-ver-b7c.md`.

### `FlujoV2_Abriendo` · Te llevamos a…

- **Qué hace:** pantalla de paso hacia la plataforma.
- **Conectada:** no.
- **Problemas:** (**alta**) Dice "Te llevamos a Netflix" aunque la persona eligió Max en la hoja (comprobado). Debe leer el proveedor del `watch_started` (el puente ya guarda `watching_movie_id`; falta exponer el proveedor). (media) "toca para seguir": toda la pantalla es el destino; está bien en táctil, pero no es un botón para teclado. (media) "Kinoo te avisa en los momentos clave" promete Función, que según P8.1 no va en la v1.

### `FlujoV3_Funcion` · En función (`img/10-funcion.jpg`)

- **Qué hace:** momentos clave durante la película ("¿Cómo te hace sentir?" a 0:47…) con 4 máscaras y cuenta atrás de 7 s.
- **Conectada:** no. "Interstellar en Netflix" fijo.
- **Problemas:** (**alta**) "Feliz · 12 % igual", "Triste · 41 % igual"… (P8.3 lo marca). (media) Se cierra solo en 7 s (WCAG 2.2.1). (media) No se puede comprobar en qué minuto va la persona (P8.1). Recomendación del documento de preguntas: sacarla de la v1 o pasar los momentos a Calificar.

### `FlujoV4_Calificar` · ¿Qué te pareció?

- **Qué hace:** aguja con 5 niveles (Me dormí … ¡Obra maestra!) y "Continuar".
- **Conectada:** sí, `confirmWatch(level)`.
- **Problemas:** (media) Si se llega sin película en curso, `confirmWatch` devuelve `false` (comprobado) y la pantalla sigue como si nada: la calificación se pierde sin aviso. Mostrar "No sabemos qué película viste" y volver a Ver. (media) No dice qué película se califica (no hay título ni póster). (media) "Saltar por ahora" mide 390 × 15. (baja) Chip "Calificación" de 122 × 36.
- **Nota:** el diseño B7c dice que lo calificado pasa a la repisa; aquí debería verse el póster para confirmar.

### `FlujoV5_Version` · ¿Qué versión de ti salió? (captura no guardada, revisada en pantalla)

- **Qué hace:** 6 frases-mood ("Me dejó pensando", "Sufrí bonito", "Para verla con alguien"…), nota de voz, "Continuar".
- **Conectada:** no; la elección no se manda (P9.2 propone `felt_vibe`).
- **Problemas:** (media) Las etiquetas de mood de las tarjetas son de **7,5 px** ("SALIR PENSANDO"…): ilegibles. (media) "Me reí con TARS" nombra un personaje de Interstellar aunque la película sea otra. (media) "Dejar una nota de voz" no hace nada visible (P9.3 recomienda sacarla). (media) "Saltar por ahora" 390 × 15. (baja) "Sentir algo" aparece como etiqueta de "Para verla con alguien", que no es un mood (P9.2).

### `FlujoV6_Gracias` · Gracias (`img/11-gracias.jpg`)

- **Qué hace:** cierre de la calificación: "3 de 3 momentos clave respondidos", calificación, versión, plataforma y "Ajustamos tus mazos: vas a ver más sufrir bonito esta semana."
- **Conectada:** no.
- **Problemas:** (**alta**) Todo es fijo: "¡Me encantó!", "Sufrí bonito", "Netflix" y la frase de ajuste, aunque la persona haya elegido otra cosa. (media) "3 de 3 momentos clave" depende de Función, que no va en la v1. (baja) Avatar sin destino.
- **Qué debería decir:** la calificación y la plataforma reales, y una frase del back (`watch_thanks`, P9.4) en palabras. Si la película pasó a la repisa, decirlo: "La guardamos en tu repisa."

### Nueva Ver (referencia B7c) (`img/12`, `img/14`, `img/15`)

No es una pantalla del prototipo todavía, pero se auditó porque se va a construir. Problemas que hay que corregir al llevarla: puntos de mood de 5 × 5 px, flechas y estrella de 40 px, "← Nuevas" de 30 px de alto, "↓ Tu repisa" de 16 px de alto, contador `#8a7458` a 4,2:1, puntos inactivos a 2,1:1, "la vistehace 3 semanas" sin espacio, "termina a las…" calculado con un valor inventado si falta la duración, `match` en los datos, y la estrella llamada "Para después". Detalle en `especificacion-ver-b7c.md`.

---

## Qué dice hoy cada pantalla "sobre la persona"

| Pantalla | Lo que dice hoy | ¿Sale de sus swipes? | Qué debería usar |
|---|---|---|---|
| Descubrir · cierre | "Hoy te inclinaste por historias épicas y de neón." | **Sí** | Se queda (`closingLine`) |
| Resumen | "Amor melancólico", "En tus 5 elecciones…", 100/80/60 % | No | `insight()` + `lastClosing()` |
| Ticket | "Lentas y melancólicas", "Hoy te movieron las historias grandes y serias." | No | Mood del mazo + `closingLine()` |
| Perfil | "Soñador de pantalla", "82/100 curiosidad", 40/30/20/10 % | No | `insight()` (arquetipo, `body`, `traits`, `moods` con niveles) |
| Ver · bloque aprendido | "Sufridor bonito", "7 de tus últimos 10 likes", 70/20/10 % | No | `insight()` (§8 de la especificación) |
| Ver · por qué hoy | "encaja con tu gusto por historias épicas y de neón." | **Sí** (con mano) / No (sin mano: "tu match más alto") | `billboard().films[i].quote` |
| Elección | "porque marcaste Interstellar" | No | Mazos propuestos por el back |
| Gracias | "vas a ver más sufrir bonito esta semana" | No | `watch_thanks` del back (P9.4) |

Hay que cuidar que las cinco pantallas que hablan de la persona (Resumen, Ticket, Perfil, Ver, Gracias) digan lo mismo: si Resumen dice "romántico" y Perfil "explorador" en el mismo momento, la persona deja de creerle a Kinoo. Por eso todas deberían leer `insight()`.

---

## Lista priorizada de cambios (máximo 15)

| # | Cambio | Severidad | ¿Rápido? | Quién |
|---|---|---|---|---|
| 1 | Ver sin mano: nunca mostrar los datos de ejemplo ("93 % contigo"); mostrar estado vacío con "Ir a Descubrir" | Alta | Sí (unas líneas en `FlujoV1_Feed`) | Front |
| 2 | Quitar todos los porcentajes y "/100": Resumen, Perfil (cifras y anillo proporcional), carta "aprendimos" de Ver, Función ("41 % igual"), y los `match` de los datos de ejemplo de Descubrir y Ver | Alta | Sí para borrar; no para reemplazar | Front |
| 3 | Construir la Ver B7c con `billboard`, `moods`, `shelf`, `star`, `rewatch` | Alta | No | Front + back |
| 4 | `insight()` en Resumen, Perfil y Ver con niveles en palabras + barras de 3 segmentos | Alta | No | Back + front |
| 5 | Hoja de plataformas con las plataformas reales de la película (`providers`) y sin precio inventado | Alta | Medio | Front (dato ya existe en `plat`) |
| 6 | Abriendo y Gracias: mostrar la plataforma, la calificación y la versión que eligió la persona | Alta | Medio (falta exponer el proveedor en el puente) | Back + front |
| 7 | Resumen y Ticket: conteos del mazo real (`lastClosing()`), no 4/1/5 ni 3/1/6 | Alta | Medio | Front |
| 8 | Enlaces muertos: avatar → Perfil; "Ir a Ver", "Mejor ver algo ahora" (×2) → `FlujoV1_Feed`; atenuar "Comunidad" | Media | **Sí** | Front |
| 9 | `fmtDur` con dos dígitos ("3 h 01") | Media | **Sí** (1 línea en `demo.ts`) | Back |
| 10 | Áreas táctiles ≥ 44 px: "i" de pilares, "Volver" (33 px), "Omitir", "Saltar por ahora", botones de Ver | Media | **Sí** (relleno/`min-height`) | Front |
| 11 | Foco visible global y fondo `#17120f` en `html, body` (franja blanca) en `kinoo-shell.css` | Media | **Sí** | Front |
| 12 | Calificar: mostrar título y póster de lo que se califica, y avisar si no hay película en curso | Media | Medio | Front (+ dato del puente) |
| 13 | Unificar moods con `vibes.json`: "Llorar bonito" (no "Sufrir bonito"), quitar "Sentir algo" duplicado | Media | Sí cuando lea `moods()` | Front |
| 14 | Textos de menos de 11 px (Versión 7,5 px; etiquetas de 10 px) a 11 px o más; contraste de `#8a7458` y `#8e6f62` | Media | **Sí** | Front |
| 15 | Decidir Función y la nota de voz (P8.1, P9.3): si no van en la v1, quitarlas del flujo y de los textos que las prometen | Media | Sí una vez decidido | Equipo |

Rápidos (menos de una hora cada uno): 1, 8, 9, 10, 11, 14, y el borrado de cifras de 2.

## Ejemplo con números

En la prueba, Camilo guardó 5 películas y dejó pasar 5:

- El cierre de Descubrir dijo bien "5 quieres ver · 0 ya la viste · 5 dejaste pasar".
- Al tocar "Ver cómo te fue", Resumen dijo "4 · 1 · 5" y "5 de 10 elegidas", y el Ticket "3 · 1 · 6": **tres versiones distintas** del mismo mazo en dos toques.
- En Ver, su primera carta fue Avengers: Endgame con duración "3 h 1" (181 min → debería ser "3 h 01").
- Después de `reset()`, Ver mostró Interstellar con "93 % contigo" aunque Camilo no había guardado nada.
- Botones bajo 44 px encontrados: 4 en Descubrir, 1 en Resumen, 1 en Ticket, 1 en Perfil, 2 en Minijuego, 4 a 6 en Ver (según el estado), 2 en Calificar y 2 en Versión: **unos 17 a 19** en total.
- Pantallas con porcentajes visibles: **4** (Resumen: 3 cifras; Perfil: 7; Ver: 3 en la carta "aprendimos" y "93 %" sin mano; Función: 4).
- Botones principales que no navegan: **6** ("Ir a Ver", "Mejor ver algo ahora" ×2, avatar en 4 pantallas cuenta como 1 problema, "Filtros", "Compartir recibo").
