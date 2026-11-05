# Preguntas: cómo recolectamos los datos desde el front

**Para qué sirve esto.** Kinoo aprende de lo que la persona hace en la app. Este documento recorre todas las funciones del prototipo y, en cada una, dice qué se recolecta hoy, qué falta decidir y qué recomendamos. Está pensado para resolverse en equipo: marca una opción en cada pregunta (o escribe otra) y con eso se ajusta el front y el back.

**Cómo leer cada pregunta.**

- **Hoy:** lo que hace el prototipo ahora.
- **Opciones:** las alternativas. La marcada con ★ es la recomendada.
- **Qué cambia en el back:** si hace falta un evento nuevo, un campo o solo configuración.

> Regla que no se discute: a la persona nunca se le muestran números ni porcentajes de afinidad. Eso afecta varias preguntas (P4.3, P6.2, P9.4).

---

## 0 · Mapa rápido: qué señal da cada función

El motor convierte cada acción en un empujón al perfil. **Señal** (w) es la dirección: positiva acerca, negativa aleja. **η** es cuánto mueve. Todo está en `packages/config/data/action_weights.json`.

| Función | Acción en pantalla | Evento | Señal (w) | η | Estado |
|---|---|---|---|---|---|
| Onboarding | Elegir una de dos películas | `onboarding_choice` | +0,8 / −0,4 | 0,20 | ✅ conectado |
| Onboarding | Elegir plataformas | `platforms_set` | — (filtra) | — | ✅ en el back, sin pantalla |
| Descubrir | Voltear la carta | `card_flipped` | — (contexto) | — | ✅ conectado |
| Descubrir | Quiero verla, sin voltear | `saved_intent` | +0,5 | 0,08 | ✅ conectado |
| Descubrir | Quiero verla, volteada | `saved_intent` | +0,4 | 0,08 | ✅ conectado |
| Descubrir | No me interesa | `dismissed` | −0,3 | 0,10 | ✅ conectado |
| Descubrir | Ya la vi (sin reacción) | `marked_seen` | +0,2 | 0,03 | ✅ conectado |
| Descubrir | Ya la vi + "me encantó" | `marked_seen` | +1,0 | 0,20 | ⚠️ falta pantalla de reacción |
| Descubrir | Terminar el mazo | `deck_completed` | — (cierre) | — | ✅ conectado |
| Ver | "← otra" | `watch_skipped` | 0 (momento, no gusto) | 0 | ✅ conectado |
| Ver | "verla →" (abrir plataforma) | `watch_started` | — | — | ✅ conectado |
| Calificar | Me encantó / Obra maestra | `watch_confirmed` | +1,0 / +1,3 | 0,25 / 0,30 | ✅ conectado (señal reina) |
| Calificar | Estuvo bien | `watch_confirmed` | +0,4 | 0,15 | ✅ conectado |
| Calificar | No era para mí / Me dormí | `watch_confirmed` | −0,8 | 0,25 | ✅ conectado |
| — | "No era por esto" (rasgo que falló) | `attribute_refuted` | corrige un átomo | — | ⚠️ en el back, sin pantalla |
| — | Deshacer | `undo` | anula un evento | — | ⚠️ en el back, sin pantalla |
| Minijuego | ¿Esto o aquello? | — | — | — | ❌ sin evento (P5) |
| Elección | Mood / Hilo / Creadores | `deck_opened` | — | — | ⚠️ solo mood (P6) |
| En función | Momentos clave | — | — | — | ❌ sin evento (P8) |
| Versión | ¿Qué versión de ti salió? | — | — | — | ❌ sin evento (P9) |
| Super like | ↑ en Ver | — | — | — | ❌ sin evento (P7.3) |

**Lo más urgente** (decidir antes de la próxima prueba con usuarios): P2.1, P3.3, P5.1, P7.3, P8.1, P9.1, P9.4 y P10.1.

---

## 1 · Cuenta, consentimiento y privacidad

**P1.1 · ¿Qué pedimos para crear la cuenta?**
- Hoy: usuario y clave de demo (`camilo` / `1234`), sin registro.
- Opciones:
  - a) Correo + código mágico, sin clave. ★
  - b) Google / Apple.
  - c) Usuario y clave.
- Qué cambia en el back: nada en el motor. La sesión la da Supabase Auth (ver `guias/despliegue.md`).

**P1.2 · ¿Cuándo pedimos la cuenta?**
- Opciones:
  - a) Al inicio.
  - b) Después del primer mazo: "guarda lo que aprendimos de ti". ★
  - c) Solo para Ver.
- Qué cambia en el back: con b), los eventos anónimos se guardan con un id temporal y se pasan a la cuenta al registrarse (falta la función de migración).

**P1.3 · ¿Cómo pedimos consentimiento para usar sus elecciones?**
- Hoy: no se pide.
- Opciones:
  - a) Una línea clara al crear la cuenta, con enlace a la política. ★
  - b) Una pantalla aparte.
  - c) Casillas por tipo de dato.
- Recomendación extra: separar en una casilla aparte el uso para curadores o la comunidad, si llega a existir.

**P1.4 · ¿Puede la persona ver y borrar lo que sabemos de ella?**
- Opciones:
  - a) Sí, desde el Perfil: "Borrar mi historial". ★
  - b) Solo por solicitud.
- Qué cambia en el back: el historial son eventos. Borrar = borrar eventos y recalcular (ya se recalcula desde cero).

**P1.5 · ¿Qué hacemos con la nota de voz (Versión)?**
- Ver P9.3. Es el único dato sensible: audio con la voz de la persona.

---

## 2 · Onboarding (arranque en frío)

**P2.1 · ¿Cuántos duelos "¿Esta o esta?" mostramos?**
- Hoy: el back pide entre 5 y 8 (`onboarding_min_pairs`, `onboarding_max_pairs`). La simulación mostró que con onboarding el primer mazo acierta 5 a 8 de 10, y sin él, 3 de 10.
- Opciones:
  - a) 5 fijos.
  - b) 6, con "uno más" opcional. ★
  - c) Hasta 8, y la persona puede saltar desde el 5.
- Qué cambia en el back: solo `params.json`.

**P2.2 · ¿Los duelos son con películas o con frases?**
- Opciones:
  - a) Películas (póster + premisa). ★ Ya está hecho.
  - b) Frases conceptuales tipo minijuego.
  - c) Mezcla: 4 películas + 2 frases.
- Qué cambia en el back: b) y c) dependen de P5.1.

**P2.3 · ¿Qué pasa si no conoce ninguna de las dos?**
- Opciones:
  - a) "No conozco ninguna": se elige por la premisa igual (no hace falta haberla visto). ★
  - b) Botón "Otro par".
- Qué cambia en el back: con b), un evento `onboarding_skipped` sin señal.

**P2.4 · ¿Pedimos plataformas en el onboarding?**
- Hoy: el evento `platforms_set` existe, pero no hay pantalla. Sin plataformas, Ver no puede filtrar.
- Opciones:
  - a) Sí, una pantalla de logos para tocar. ★
  - b) Solo la primera vez que entra a Ver.
- Qué cambia en el back: nada.

**P2.5 · ¿Pedimos país?**
- Opciones:
  - a) Se deduce del teléfono y se puede cambiar. ★
  - b) Se pregunta.
- Por qué importa: las plataformas cambian por país (TMDB entrega la disponibilidad por país).

**P2.6 · ¿Mostramos la carta de perfil (arquetipo) al terminar el onboarding?**
- Opciones:
  - a) Sí, como premio. ★
  - b) Solo después del primer mazo, cuando el perfil es más fiable (con menos de 15 señales el motor confía poco).

---

## 3 · Descubrir (el mazo)

**P3.1 · Gestos: ¿qué hace cada uno?**
- Hoy: botones "Quiero verla", "No me interesa", "Ya la vi" y tocar para voltear.
- Opciones:
  - a) Mantener botones y sumar swipe (derecha = quiero, izquierda = no). ★
  - b) Solo botones.
- Qué cambia en el back: nada. El back recibe acciones, no gestos.

**P3.2 · ¿Diferenciamos "lo guardó sin voltear" de "lo guardó después de voltear"?**
- Hoy: sí. Sin voltear pesa un poco más (+0,5 contra +0,4), porque lo convenció solo la premisa.
- Pregunta: ¿les parece bien o quieren que pese igual?

**P3.3 · "Ya la vi": ¿preguntamos cómo le pareció?**
- Hoy: "Ya la vi" manda `marked_seen` sin reacción y casi no mueve el perfil (η 0,03). Con reacción, es de las señales más fuertes (+1,0 si le encantó).
- Opciones:
  - a) Al tocar "Ya la vi", aparecen 3 caras: me encantó / bien / no era para mí. Un toque, sin pantalla nueva. ★
  - b) No preguntar.
  - c) Preguntar solo 1 de cada 3 veces.
- Qué cambia en el back: nada; ya acepta `reaction`.

**P3.4 · ¿Contamos el tiempo que mira cada carta?**
- Opciones:
  - a) No, por ahora. ★
  - b) Sí, como contexto (sin señal) para estudiar después.
- Qué cambia en el back: con b), campo `dwell_ms` en `context`.

**P3.5 · Ficha ADN, tráiler y "Ver más": ¿son señal?**
- Hoy: no se registran.
- Opciones:
  - a) Registrarlos como contexto, sin mover el perfil. ★
  - b) Que abrir el ADN o el tráiler sea una señal positiva suave.
- Qué cambia en el back: eventos `dna_opened`, `trailer_opened` y `overview_expanded`, sin peso.

**P3.6 · ¿La persona puede deshacer?**
- Hoy: el back tiene `undo`, el front no.
- Opciones:
  - a) Botón "↶" por 5 segundos después de cada acción. ★
  - b) No.

**P3.7 · "No me interesa": ¿preguntamos por qué?**
- Hoy: no. El back tiene `attribute_refuted` ("no era por esto") para corregir un rasgo.
- Opciones:
  - a) Nunca en el mazo (rompe el ritmo); solo en Ver, después de "No era para mí". ★
  - b) Cada 5 descartes, un chip opcional: "Muy lenta / Muy oscura / Ya me cansé del género".
- Qué cambia en el back: cada chip se traduce a un átomo (por ejemplo, "Muy lenta" → `pausada`).

**P3.8 · La carta especial ("Esta es muy tú"): ¿cómo se ve?**
- Hoy: el back marca `special_match` y `special_treatment`; el diseño de Descubrir tiene el aro dorado.
- Pregunta: ¿hay sonido o vibración? ¿Se comparte?

**P3.9 · La premisa de la carta.**
- Hoy: se corta en 44 caracteres y muchas terminan en "…".
- Opciones:
  - a) El juez escribe una premisa corta aparte (≤ 44) para cada película. ★
  - b) Agrandar el espacio de la premisa.
- Qué cambia en el back: campo `premise_short` en el catálogo.

---

## 4 · Fin del mazo (Resumen, Ticket, Perfil)

**P4.1 · Resumen: ¿qué datos mostramos?**
- Hoy: "5 de 10 elegidas", temas y la frase de lo aprendido (ya viene del back).
- Pregunta: ¿mostramos los pósters de las guardadas (ya llegan en `closing.saved_posters`)?

**P4.2 · Ticket coleccionable: ¿se comparte?**
- Opciones:
  - a) Sí, como imagen para historias. ★
  - b) No.
- Qué cambia en el back: con a), evento `shared` (contexto, sin peso). Sirve para medir boca a boca.

**P4.3 · Perfil: "Curiosidad 82/100" y "Lo que te atrapa 40 %".**
- Hoy: son datos de ejemplo y van contra la regla de "nada de números".
- Opciones:
  - a) Pasarlos a palabras: "Muy curioso", "Lo que más te atrapa: grandes emociones" y barras sin cifras. ★
  - b) Dejar números solo en el perfil (rompe la regla).
- Qué cambia en el back: un `ProfileDTO` con niveles en palabras (pendiente).

**P4.4 · ¿Cada cuánto mostramos el perfil?**
- Opciones:
  - a) Al terminar cada mazo, en corto. ★
  - b) Solo cuando cambia el arquetipo.
  - c) Siempre disponible en una pestaña.

**P4.5 · "Ver cómo te fue" / "Repetir el mazo": ¿repetir cuenta como señal?**
- Opciones:
  - a) No: repetir es para revisar, no para opinar. ★
  - b) Sí, como interés en el mood.

---

## 5 · Minijuego "¿Esto o aquello?"

Es la mejor oportunidad para entrenar el algoritmo sin películas: en 10 segundos sabemos qué tipo de historia mueve a la persona. Hoy no manda nada al back.

**P5.1 · ¿Qué mide cada pregunta?**
- Hoy: frases como "Hacerte amigo de una roca" contra "Sudar en un laboratorio", sin vínculo con el algoritmo.
- Opciones:
  - a) Cada frase se traduce a 1 o 2 átomos, con valor entre 0 y 1 (por ejemplo, "Hacerte amigo de una roca" → `intimidad` +, `contemplativa` +; "Sudar en un laboratorio" → `tensa` +, `complejidad` +). ★
  - b) Cada frase se traduce a un mood.
  - c) Que sea solo diversión, sin señal.
- Qué cambia en el back:
  - un archivo `packages/config/data/minigame.json` con las preguntas y sus átomos (Camilo lo edita);
  - un evento `minigame_answered` con peso propio en `action_weights.json`. Recomendamos señal +0,5 y η 0,05: menos que una película, porque es una preferencia imaginada.

**P5.2 · ¿Cada cuánto aparece?**
- Hoy: "Una pregunta · al cerrar el mazo".
- Opciones:
  - a) Una al cerrar cada mazo. ★
  - b) Solo cuando el motor tiene poca confianza (menos de 15 señales) o el perfil está empatado entre dos átomos.
  - c) a) + b): siempre una, y la elige el motor para resolver su mayor duda.
- Recomendación extra: c) es lo ideal a mediano plazo (el motor pregunta lo que no sabe).

**P5.3 · ¿Qué pasa si no responde en 10 segundos o toca "Omitir"?**
- Opciones:
  - a) No se registra nada. ★
  - b) Se registra `minigame_skipped` para saber si el juego cansa.
- Recomendación extra: registrar b) solo como contexto, para medir.

**P5.4 · ¿El tiempo de respuesta importa?**
- Opciones:
  - a) No. ★
  - b) Sí: responder en menos de 2 s pesa más ("sin pensarlo").

**P5.5 · ¿Habrá otros minijuegos?**
- Ideas que encajan con el motor:
  - **"Ordena el póster"**: elegir entre 3 paletas (neón, pastel, cálida). Entrena los átomos visuales.
  - **"¿Cuál de estas te dio más miedo?"**: entrena `tensa` e `inquietante`.
  - **"Completa la frase"**: "Una buena película me deja…" con 4 finales. Entrena el mood favorito.
- Pregunta: ¿cuáles priorizamos? Todos usarían el mismo evento `minigame_answered` con su tabla de átomos.

**P5.6 · ¿Mostramos lo que aprendimos del minijuego?**
- Opciones:
  - a) Una frase corta: "Anotado: te tiran las historias íntimas". ★
  - b) Nada.

---

## 6 · Elección del próximo mazo (Mood / Hilo / Creadores)

**P6.1 · Hilo ("Sigue a Christopher Nolan"): ¿qué es exactamente?**
- Hoy: está en el diseño, pero el back solo arma mazos por mood.
- Opciones:
  - a) Un mazo con películas del mismo director, actor o tema que la persona guardó. ★
  - b) Una colección hecha a mano por el equipo.
- Qué cambia en el back: `openDeck({ thread: { kind: 'director', id } })` y un filtro previo al puntaje. Es poco trabajo.

**P6.2 · Creadores ("Lo que guardaron Ana y Leo"): ¿de quiénes?**
- Hoy: el back ya soporta curadores (mazos de curador con `curator_name`), pero no amigos.
- Opciones:
  - a) Curadores públicos de Kinoo. ★ Ya está en el back.
  - b) Amigos (requiere red social: fuera de alcance por ahora).
- Qué cambia en el back: con a), una pantalla para seguir curadores (`followedCuratorIds`).

**P6.3 · ¿Elegir un camino es señal?**
- Opciones:
  - a) Solo contexto: cuál eligió y cuál no. ★
  - b) Elegir un mood suma un poco a ese mood.

**P6.4 · ¿Tamaño del mazo: 5, 10 o 20?**
- Hoy: el back acepta los tres; el diseño muestra 10.
- Pregunta: ¿dejamos elegir el tamaño o lo decide Kinoo (5 si tiene poco tiempo)?

---

## 7 · Ver (una propuesta para esta noche)

**P7.1 · ¿Qué mood trae? ¿Es obligatorio?**
- Opciones:
  - a) Opcional; sin mood, la propuesta usa solo el perfil. ★
  - b) Obligatorio.

**P7.2 · Filtros: ¿cuáles?**
- Hoy: el back acepta duración máxima, mood y compañía (`solo`, `pareja`, `amigos`, `familia`).
- Pregunta: ¿la compañía cambia algo? Propuesta: con familia, bajar `sombria` y `cruda`; con amigos, subir `humor`.
- Qué cambia en el back: una receta corta por compañía en `vibes.json`.

**P7.3 · Super like (↑): ¿qué significa?**
- Hoy: el diseño lo tiene ("desliza · ↑ super like", "Tus super likes", "Jugar mi mazo de super likes"), pero no hay evento.
- Opciones:
  - a) "La quiero ver sí o sí": señal fuerte (+0,8, η 0,12) y la película queda primera en Ver. ★
  - b) Solo una lista de favoritos, sin señal.
- Qué cambia en el back: evento `super_liked` y una fila en `action_weights.json`.

**P7.4 · "Lista" / "otro momento": ¿qué es cada una?**
- Hoy: el cierre de Ver muestra "en tu lista" y "otro momento".
- Pregunta: ¿"otro momento" es igual a "← otra" (no es señal) o es un descarte suave?
- Recomendación: igual a "← otra", sin señal.

**P7.5 · Después de 3 "otra" seguidas, ¿qué hacemos?**
- Hoy: el back responde `suggest_discover` y el front invita a Descubrir.
- Pregunta: ¿les parece bien 3? (`watch_skip_limit`)

**P7.6 · Plataformas que no tiene: ¿alquilar?**
- Opciones:
  - a) Mostrar "Alquilar en…" solo si no está en ninguna de sus plataformas. ★
  - b) Nunca.
- Atribución: la disponibilidad viene de TMDB (JustWatch). Hay que mostrar "Datos de TMDB" en la pantalla.

**P7.7 · ¿Cuándo preguntamos "¿La viste?"?**
- Hoy: al volver de la plataforma, se pasa a Calificar.
- Opciones:
  - a) Al volver a la app, si pasó más del 60 % de la duración. ★
  - b) Al día siguiente, con notificación.
  - c) a) y, si no volvió, b).
- Qué cambia en el back: el back ya guarda `watch_started` con la hora. Falta el aviso.

---

## 8 · En función (momentos clave mientras la ve)

Hoy el prototipo muestra 3 momentos (minuto 0:47 "¿Cómo te hace sentir?", 1:31 "¿A quién estás odiando?", 2:14 "¿Te lo esperabas?"). Cada uno se cierra en 7 s y muestra "41 % igual".

**P8.1 · ¿Es una función real del producto?**
- Kinoo no reproduce la película. Para saber "en qué minuto va", habría que:
  - pedir que la persona toque "play" en Kinoo al mismo tiempo, o
  - escuchar el audio (no recomendado: privacidad).
- Opciones:
  - a) Dejarlo para después; en la v1, los momentos se preguntan al final, en Calificar. ★
  - b) Hacerlo con un cronómetro que la persona inicia.

**P8.2 · Si se hace, ¿qué mide?**
- "¿Cómo te hace sentir?" (Feliz / Triste / Nervios / Asombro) se traduce bien a átomos:
  - Triste → `melancolica`;
  - Nervios → `tensa`;
  - Asombro → `escala_epica` u `onirica`;
  - Feliz → `luminosa`.
- Sería una señal suave (η 0,05) sobre esos átomos, y además ayuda a corregir el ADN de la película (si muchos dicen "Nervios" en una película que el juez marcó tranquila).
- "¿A quién odias?" y "¿Te lo esperabas?": diversión, sin señal.

**P8.3 · "41 % igual".**
- Va contra la regla de no mostrar números. Además, sin usuarios reales es inventado.
- Opciones:
  - a) "Como la mayoría" / "Pocos sintieron lo mismo". ★
  - b) Quitarlo.

---

## 9 · Calificar y "¿Qué versión de ti salió?"

**P9.1 · Escala de calificación: 5 niveles.**
- Hoy: Me dormí · No era para mí · Estuvo bien · ¡Me encantó! · ¡Obra maestra!
- El back los traduce así:
  - Me dormí y No era para mí → `not_for_me` (−0,8);
  - Estuvo bien → `liked` (+0,4);
  - Me encantó → `loved` (+1,0);
  - Obra maestra → `loved` + `rewatch` (+1,3).
- Pregunta: "Me dormí" ¿es "no era para mí" o es cansancio (sin señal)?
- Recomendación: sin señal, porque dormirse a veces es del día y no de la película. Se registra igual para medir.

**P9.2 · "¿Qué versión de ti salió al final?": ¿qué es?**
- Hoy: 6 frases que equivalen a moods:

  | Frase | Mood |
  |---|---|
  | Me dejó pensando | Salir pensando |
  | Sufrí bonito | Llorar bonito |
  | Me voló la cabeza | Algo raro |
  | Para verla con alguien | ¿? |
  | Me escapé un rato | Escapar |
  | Me reí con… | Solo reírme |

- Opciones:
  - a) Es la señal que entrena los moods: la película pasa a contar como ejemplo de ese mood **para esta persona** (su receta personal se mueve hacia el ADN de la película). ★
  - b) Solo diversión.
- Qué cambia en el back: `watch_confirmed` gana un campo `felt_vibe` y el motor mueve la receta de ese mood (la receta personal ya existe; solo cambia de dónde sale el mood).
- "Para verla con alguien" no es un mood: proponemos que alimente el filtro de compañía (P7.2).

**P9.3 · Nota de voz.**
- Opciones:
  - a) Sacarla de la v1. ★ Es audio personal, cuesta almacenarlo y el motor no lo usa.
  - b) Guardarla para que el equipo la escuche (con consentimiento explícito).
  - c) Transcribirla y extraer el mood con IA (más adelante).

**P9.4 · Gracias: "Ajustamos tus mazos: vas a ver más sufrir bonito esta semana".**
- Opciones:
  - a) Que la frase la genere el back según lo que de verdad cambió (como la frase del cierre del mazo). ★
  - b) Frase fija.
- Qué cambia en el back: plantilla `watch_thanks` en `explanation_templates.json`.

**P9.5 · "Saltar por ahora": ¿volvemos a preguntar?**
- Opciones:
  - a) Una vez más, al abrir la app la próxima vez. ★
  - b) Nunca.

---

## 10 · Comunidad y curadores

**P10.1 · ¿Qué hay en la pestaña Comunidad en la v1?**
- Recordatorio: el plan excluye pantallas sociales.
- Opciones:
  - a) Solo curadores para seguir (el back ya los soporta). ★
  - b) Ocultar la pestaña.
  - c) Feed social (fuera de alcance).

**P10.2 · ¿Usamos los gustos de otras personas?**
- Hoy: no. El back tiene `community_prior_weight` reservado.
- Pregunta: cuando haya usuarios, ¿queremos "a quienes les gustó X también les gustó Y"? Necesita consentimiento (P1.3) y unos 1.000 usuarios activos para servir.

---

## 11 · Notificaciones

**P11.1 · ¿Qué notificaciones mandamos?**
- Opciones (varias):
  - "¿La viste?" al día siguiente de abrir una plataforma (P7.7). ★
  - "Tu mazo semanal está listo". ★
  - Estrenos que encajan con su perfil.
- Pregunta: ¿cuántas por semana como máximo? Recomendamos 2.

---

## 12 · Medición (para el equipo, no para la persona)

**P12.1 · ¿Qué medimos para saber si el algoritmo funciona?**
- Propuesta:
  - **Tasa de guardado por mazo** (meta: 3 de 10 o más).
  - **Conversión a Ver**: de lo guardado, cuánto se abre en una plataforma.
  - **"Me encantó" sobre visto** (la señal reina).
  - **Mazos hasta un perfil estable** (la simulación dice entre 13 y 24 señales).
- Qué cambia en el back: todo sale de la tabla de eventos. Falta un tablero (Supabase SQL o Metabase).

**P12.2 · ¿Pruebas A/B de pesos?**
- Opciones:
  - a) Más adelante, con usuarios reales. ★ Los pesos ya son configuración y se pueden versionar.

---

## Resumen de eventos nuevos que saldrían de estas respuestas

Si se aceptan las recomendaciones ★:

| Evento nuevo | Pregunta | Peso propuesto |
|---|---|---|
| `minigame_answered` | P5.1 | +0,5 · η 0,05 sobre los átomos de la frase |
| `minigame_skipped` | P5.3 | sin peso (medición) |
| `super_liked` | P7.3 | +0,8 · η 0,12 |
| `dna_opened`, `trailer_opened`, `overview_expanded` | P3.5 | sin peso (contexto) |
| `shared` | P4.2 | sin peso (medición) |
| `watch_confirmed.felt_vibe` (campo) | P9.2 | mueve la receta personal del mood |
| `watch_confirmed.fell_asleep` (campo) | P9.1 | sin peso |

Todos se agregan igual que los demás: un tipo en `packages/shared/src/events.ts`, una fila en `action_weights.json` y una prueba en `packages/engine/test`. El motor no cambia de forma.

## Ejemplo con números

Ana responde el minijuego al cerrar su primer mazo: elige "Hacerte amigo de una roca".

El motor mueve cada átomo hacia un objetivo: objetivo = señal × rasgo; nuevo = actual + η × (objetivo − actual).

- Con la recomendación de P5.1, la frase vale 1 en `intimidad` y `contemplativa`. La señal es +0,5 con η 0,05, así que el objetivo es 0,5 × 1 = 0,5.
- Si su `intimidad` estaba en 0,30, sube a 0,30 + 0,05 × (0,5 − 0,30) = **0,31**.
- Para comparar: un "Me encantó" en Ver sobre *Past Lives* (rasgo íntimo 0,805) tiene objetivo 1,0 × 0,805 y la lleva a 0,30 + 0,25 × (0,805 − 0,30) = **0,426**.

Es decir: el minijuego afina, pero no le gana a lo que la persona de verdad ve. Por eso pesa poco.
