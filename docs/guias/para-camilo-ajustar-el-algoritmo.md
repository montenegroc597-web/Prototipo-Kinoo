# Para Camilo: cómo ajustar el algoritmo sin programar

**Para qué sirve esto.** Todo lo que se puede ajustar de Kinoo vive en archivos de texto dentro de `data/config/`. Esta guía dice qué archivo abrir, qué valor cambiar y qué efecto tiene. No hace falta tocar código.

## Antes de empezar

- Los archivos son JSON: texto con llaves `{ }`, comillas y comas. Cambia solo los números o los textos entre comillas. No borres comas ni llaves.
- Puedes editarlos en GitHub: abre el archivo, toca el lápiz ✏️, cambia el valor y guarda con "Commit changes" **en la rama `back/algoritmo-v2`** (nunca en `main`).
- Al guardar, la CI corre las pruebas. Si algo queda mal escrito o rompe una regla (por ejemplo, un número en una plantilla), la CI se pone en rojo y te dice qué falló.
- Para que Supabase reciba el cambio, alguien corre `npm run seed` y aplica `supabase/seed/001_config.sql`. El modo demo lo toma solo en la próxima publicación.

## Los archivos

| Quiero… | Archivo | Qué cambiar |
|---|---|---|
| Que una acción pese más o menos | `action_weights.json` | `signal` y `eta` |
| Crear, renombrar o apagar un mood | `vibes.json` | una entrada de la lista |
| Cambiar la receta de un mood | `vibes.json` | `recipe` |
| Cambiar el tamaño o el orden del mazo | `deck_recipes.json` | `slots` |
| Cambiar cómo explica Kinoo | `explanation_templates.json` | `text` |
| Cambiar cómo se nombra un rasgo | `atoms.json` | `label` |
| Cambiar los arquetipos del perfil | `archetypes.json` | `name` y `recipe` |
| Ajustar umbrales y equilibrios | `params.json` | el número |

## 1. Cuánto pesa cada acción (`action_weights.json`)

Cada acción tiene dos números:

- **`signal`** (de −1 a +1,3): hacia dónde empuja y con qué fuerza. Positivo = "más de esto"; negativo = "menos de esto".
- **`eta`** (de 0 a 1): qué tan rápido se mueve el perfil. Con 0,25, cada evento recorre la cuarta parte del camino hacia su objetivo.

Ejemplo: quieres que "Quiero verla" enseñe más. Busca:

```json
{ "action": "saved_intent", "variant": "flipped", "signal": 0.4, "eta": 0.08 }
```

y cambia `eta` a `0.12`. Efecto: cada carta guardada mueve el perfil un 50 % más.

**Cuidado:** `dismissed` tiene `eta = 0.10` porque con el valor inicial (0,03) el perfil no seguía los cambios de gusto (ver `PROGRESS.md`). Si lo bajas, corre `npm run sim` y mira si "Responde al cambio" sigue en verde.

## 2. Moods (`vibes.json`)

Cada mood es una entrada como esta:

```json
{ "key": "llorar_bonito", "name": "Llorar bonito", "definition": "Historias que te conmueven sin dejarte destruido.",
  "aliases": ["sufrir", "sentir"], "active": true, "version": 1,
  "recipe": { "carga_emocional": 0.9, "melancolica": 0.6, "reconfortante": 0.4, "intimidad": 0.4, "sombria": -0.5, "frenetica": -0.4 } }
```

- **`name`** y **`definition`**: lo que ve la persona. La prueba de octubre pidió una definición de una frase para cada mood.
- **`recipe`**: los rasgos que pide el mood, de −1 (lo evita) a +1 (lo busca). Los nombres de los rasgos están en `atoms.json`.
- **`active: false`** apaga el mood sin borrarlo.
- **`version`**: súbela (de 1 a 2) cuando cambies la receta. Así se sabe qué personas tienen copia de la receta vieja.
- **`quality_weight`** (opcional): cuánto pesa la nota de la película en ese mood. "Cine del bueno" usa 0,35; los demás, 0,10.
- **`example_movie_ids`**: fija a mano las películas de ejemplo (por ejemplo, para que *Entre navajas* no sea el ejemplo de "Solo reírme").

**Fusionar "Sufrir bonito" y "Sentir algo"** (decisión pendiente): hoy ambos son alias de "Llorar bonito". Para separarlos, crea un mood nuevo con `key: "sentir_algo"` y quita `"sentir"` de los alias de `llorar_bonito`.

Las recetas personales nunca cambian la semilla: cada persona tiene su copia, que se ajusta con lo que hace dentro del mood.

## 3. Mazos (`deck_recipes.json`)

Hay una receta por tamaño (5, 10 y 20). Cada posición tiene un rol:

| Rol | Qué pone |
|---|---|
| `afin` | De lo que más le encaja |
| `creador` | Del mazo del Equipo Kinoo (o de un curador que sigue, cuando exista Comunidad) |
| `comodin` | Comparte su rasgo favorito, pero en lo demás es distinta |
| `sorpresa` | Muy bien valorada, fuera de su zona. Lleva tratamiento visual especial |

`"rank": "first"` marca la apertura (la de mayor puntaje) y `"rank": "second"`, el cierre alto (la segunda). Para que el mazo de 10 abra con un comodín, mueve `{ "role": "comodin" }` a la primera posición y pasa el `"rank": "first"` a otra afín.

El mazo del Equipo Kinoo está en `data/catalog/team_deck.json`: ahí eliges sus películas y escribes las notas.

## 4. Cómo explica Kinoo (`explanation_templates.json` y `atoms.json`)

```json
{ "key": "profile", "text": "Encaja con tu gusto por historias {a} y {b}." }
```

- `{a}` y `{b}` se reemplazan por las etiquetas de los dos rasgos que más aportaron. Las etiquetas están en `atoms.json` (por ejemplo, `"label": "de luz cálida"`).
- `{mood}` es el nombre del mood en minúscula. `{curator}` es el nombre del curador.
- **Regla dura:** ningún texto puede tener números ni %. Si alguien los pone, la base de datos rechaza la plantilla y la CI falla. Si aun así llegara uno, el motor lo cambia por una frase segura.

## 5. Umbrales y equilibrios (`params.json`)

Los más útiles:

| Parámetro | Valor | Qué hace si lo subes |
|---|---|---|
| `beta_with_vibe` | 0,5 | Con mood, pesa más el gusto general que el mood |
| `beta_low_confidence` | 0,3 | Con pocas señales, pesa más el gusto general (más bajo = más mood) |
| `low_confidence_signal_count` | 15 | Se considera "poca información" por más tiempo |
| `quality_weight` | 0,10 | Pesa más la nota de la película |
| `exclusion_days_dismissed` | 30 | Una película descartada tarda más en volver |
| `dismiss_fatigue_weight` | 0,3 | Tras descartar algo, lo parecido se esconde más ese día |
| `diversity_max_cosine` | 0,95 | Más bajo = mazos más variados (pero menos afines) |
| `special_match_percentile` | 0,95 | Más alto = "Esta es muy tú" sale menos |
| `watch_skip_limit` | 3 | Cuántas "otra" seguidas antes de sugerir Descubrir |
| `watch_fresh_bonus` | 0,10 | Lo guardado en las últimas 48 h sale antes en Ver |
| `distinct_threshold` | 0,2 | Más alto = aprende solo de los rasgos más marcados |
| `community_prior_weight` | 10 | Más votos de la comunidad para corregir al juez |

## 6. Comprobar que sigue aprendiendo

Después de cualquier cambio, alguien del equipo corre:

```bash
npm run sim
```

y revisa `packages/engine/sim/RESULTADOS.md`. Las cinco pruebas deberían seguir en ✅.

## Ejemplo completo con números

Quieres que "Llorar bonito" deje de proponer películas sombrías.

1. Abre `data/config/vibes.json`.
2. En `llorar_bonito`, cambia `"sombria": -0.5` por `"sombria": -0.9` y sube `"version": 1` a `"version": 2`.
3. Guarda en la rama `back/algoritmo-v2`.

Efecto en una película con rasgo distintivo sombrío 0,8 y melancólico 0,9, con una receta que solo tuviera esos dos rasgos:

- Antes: `0,6 × 0,9 + (−0,5) × 0,8 = 0,54 − 0,40 = 0,14` (todavía suma un poco).
- Después: `0,6 × 0,9 + (−0,9) × 0,8 = 0,54 − 0,72 = −0,18` (ahora resta).

El motor usa el coseno, no esta suma directa, pero la dirección del cambio es la misma: la película baja en los mazos de "Llorar bonito".
