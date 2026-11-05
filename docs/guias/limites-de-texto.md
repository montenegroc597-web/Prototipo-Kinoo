# Límites de texto del front

**Para qué sirve esto.** Fija cuántos caracteres puede tener cada texto de la app para que nunca se salga de su tarjeta, su chip o su recuadro. Sirve para diseñar pantallas nuevas, escribir textos (moods, plantillas, pilares) y conectar un front nuevo sin sorpresas.

## Cómo funciona

1. **Los máximos viven en la configuración**, en `packages/config/data/params.json` (claves `card_*`, `watch_*` y `closing_*`). Si el diseño cambia de tamaño, se cambian esos números.
2. **El back entrega los textos ya recortados.** Cada carta trae `display` con premisa, título, subtítulo, sinopsis, razón, pilares, frase ADN y temas. Lo hace `toCardDTO()` en `packages/engine/src/cards.ts`.
3. **Cómo recorta (`fitText()` en `@kinoo/shared`):** si el texto pasa el máximo, termina en la última frase completa que quepa; si no hay ninguna, corta en una palabra y agrega "…". Nunca corta una palabra a la mitad.
4. **Las pruebas lo vigilan.** `apps/web/e2e/cartas.spec.ts` abre las 69 películas en el navegador y comprueba que ningún texto se salga ni se monte sobre otro en el frente, el reverso, la ficha ADN y Ver, ni en las pantallas fijas. `packages/catalog/test/catalog.test.ts` comprueba que ningún texto entregado pase su límite.

## Límites por pantalla

### Descubrir · frente de la carta

| Texto | Máximo | Clave | Si es más largo |
|---|---|---|---|
| Premisa (frase gancho corta) | **44** | `card_premise_max` | Corta en una palabra con "…" |
| Pilares: ritmo, tono, historia, visual | **15** cada uno | `card_pillar_max` | Se reescriben en el catálogo; si llega uno largo, "…" |
| Razón al pie ("Encaja con tu gusto por…") | **96** (2 líneas) | `card_explanation_max` | Frase completa o "…" |
| Géneros (chips) | 3 chips; el más largo es "Ciencia ficción" (15) | — | — |

### Descubrir · reverso de la carta

| Texto | Máximo | Clave | Notas |
|---|---|---|---|
| Título | **24** | `card_title_max` | El tamaño baja según el largo: hasta 12 → 40 px · 15 → 38 · 18 → 34 · 21 → 30 · 24 → 26 px |
| "Una película de…" | **40** | `card_subtitle_max` | Si no cabe: el primer director y "y otros" |
| Sinopsis | **110** (3 líneas + "Ver más") | `card_overview_max` | La sinopsis completa queda en `back.overview` para una vista de detalle |
| Póster | — | — | Vertical en un espacio horizontal: se encuadra hacia arriba (`50% 22%`) |

### Descubrir · ficha ADN

| Texto | Máximo | Clave | Notas |
|---|---|---|---|
| "En una frase" | **44** | `card_dna_phrase_max` | Es el ADN de la película, no de la persona: "Historias íntimas y melancólicas" |
| Temas (chips) | Hasta 3; **30 caracteres sumados** | `card_dna_themes_max_chars` | Usa el nombre corto del átomo (`theme` en `atoms.json`, **14** como máximo) |
| "Se siente" | **15** por pilar | `card_pillar_max` | Es el recuadro más angosto: manda sobre el frente |
| "Se parece a" (títulos) | **22** | `card_similar_title_max` | |

### Descubrir · cierre del mazo

| Texto | Máximo | Clave | Notas |
|---|---|---|---|
| Frase de lo aprendido | **80** (2 líneas) | `closing_text_max` | Con menos de 2 cartas guardadas, la frase es neutra |
| Títulos en el abanico de cartas | Los del título (24) | — | Las cartas se superponen a propósito; el título de abajo queda tapado en parte |

### Ver · propuesta para esta noche

| Texto | Máximo | Clave | Notas |
|---|---|---|---|
| Título | **24**, en 1 línea | `watch_title_max` | Hasta 14 → 46 px · 18 → 34 · 24 → 28 px. Si ocupara 2 líneas, empujaría las plataformas detrás de la barra inferior |
| "duración · género · director" | **44** | `watch_meta_max` | Con varios directores: el primero y "y otros" |
| "Por qué hoy:" | **80** | `watch_why_max` | |
| Plataformas (chips) | Hasta 4 | — | |

### Textos que escribe el equipo

| Texto | Máximo | Dónde se edita | Por qué |
|---|---|---|---|
| Nombre de un mood | **18** (2 líneas bajo el ícono) | `vibes.json` → `name` | Carrusel de Ver |
| Definición de un mood | **90** | `vibes.json` → `definition` | Una frase |
| Etiqueta de un átomo | **24** | `atoms.json` → `label` | Encaja en "historias {etiqueta}" dentro de la razón (96) |
| Tema de un átomo | **14** | `atoms.json` → `theme` | Chip de la ficha ADN |
| Nombre de un arquetipo | **14** | `archetypes.json` → `name` | |
| Plantilla de explicación | **50** sin los huecos | `explanation_templates.json` | Con dos etiquetas largas, el resultado no debe pasar de 96 |
| Pilar (catálogo) | **15** | lo escribe el juez | El prompt ya lo pide; `catalog:build` avisa si alguno es largo o tiene letras anchas |
| Frase gancho (catálogo) | **160** | lo escribe el juez | En la carta se muestran los primeros 44 |

### Textos fijos del diseño (recomendación para pantallas nuevas)

Medidos sobre el prototipo actual:

| Elemento | Recomendado |
|---|---|
| Botón principal (mayúsculas condensadas, 22 px) | 22 caracteres ("EMPEZAR A DESCUBRIR") |
| Chip | 16 |
| Etiqueta pequeña en mayúsculas | 18 |
| Aviso flotante (toast) | 60 |

## Pendientes que encontró la revisión

- **Porcentajes en pantallas sin conectar.** Resumen ("100 %"), Perfil ("82/100", "40 %") y Función ("12 % igual") todavía muestran números de ejemplo. Cuando se conecten al motor, deben pasar a palabras: el principio 1 prohíbe mostrar afinidad en números.
- **Premisa con "…".** Muchas frases gancho tienen más de 44 caracteres y se ven cortadas. Lo ideal es que el juez escriba además una premisa corta (≤ 44); está en el documento de preguntas.

## Ejemplo con números

*Eterno resplandor de una mente sin recuerdos* tiene 44 caracteres de título:

- En el reverso, el máximo es 24: `fitText` corta en la última palabra que cabe y queda **"Eterno resplandor de…"** (21). Con 21 caracteres, el título va a 30 px.
- En Ver pasa lo mismo y, con 21 caracteres, va a 28 px en una línea.
- Su sinopsis tiene 140 caracteres. Como la primera frase termina en el 104 y cabe en 110, se muestra completa y sin "…".
