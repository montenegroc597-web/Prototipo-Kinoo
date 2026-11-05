# Cómo funciona el algoritmo de Kinoo

**Para qué sirve esto.** Explica en lenguaje sencillo cómo piensa Kinoo, cuál es su lógica y por qué tiene valor. Es la versión de texto de la presentación gráfica [`presentacion/como-funciona-kinoo.html`](presentacion/como-funciona-kinoo.html), que además trae un laboratorio para probarlo. El detalle técnico está en [`KINOO_ALGORITMO_v2.md`](KINOO_ALGORITMO_v2.md) y en [`guias/algoritmo-paso-a-paso.md`](guias/algoritmo-paso-a-paso.md).

## La idea en una frase

Kinoo lee de qué está hecha cada película, aprende qué de eso te mueve a ti y te propone una para esta noche, con una razón en palabras.

## El punto de valor

| Pregunta | Lo de siempre | Kinoo |
|---|---|---|
| ¿Qué te muestra? | Lo popular, o lo parecido a lo último que viste | Lo que comparte contigo los rasgos que te mueven, en el mood que traes hoy |
| ¿Cómo lo explica? | "98 % para ti", o nada | "Encaja con tu gusto por historias íntimas y melancólicas" |
| ¿De qué aprende? | Clics y minutos vistos | De lo que guardas, lo que descartas y, sobre todo, de lo que viste y cómo te dejó |
| ¿Y si cambias? | Tarda semanas en notarlo | Los descartes recientes pesan más y el mazo se ajusta en el siguiente |

Cuatro promesas:

1. **Entiende el porqué.** No piensa en géneros, sino en 21 rasgos. Dos dramas pueden ser opuestos.
2. **Una para esta noche.** Ver propone una sola, de las que ya guardaste y que está en tus plataformas.
3. **Te explica en palabras.** Nunca muestra porcentajes ni puntajes de afinidad.
4. **Aprende de lo que ves.** La señal que más enseña es ver la película y decir "me encantó".

## Los 7 pasos

### 1 · El ADN de cada película: 21 rasgos

Cada película tiene 21 rasgos, cada uno entre 0 y 1, en cuatro familias:

| Familia | Rasgos |
|---|---|
| Ritmo | frenética, ágil, a fuego lento, contemplativa |
| Atmósfera | reconfortante, luminosa, melancólica, tensa, inquietante, sombría |
| Estética | cruda, onírica, neón, pastel, cálida, blanco y negro |
| Fondo | carga emocional, complejidad, humor, intimidad, escala épica |

Los pone un juez (un modelo de IA con ejemplos calibrados por el equipo) a partir de la ficha de TMDB. La comunidad podrá corregirlos con sus votos.

Kinoo no usa el valor tal cual, sino **cuánto sobresale del promedio del catálogo** (el rasgo distintivo):

```
rasgo distintivo = (valor − promedio) ÷ (1 − promedio)      (0 si está por debajo del promedio)
```

### 2 · Tu perfil

Tu perfil usa los mismos 21 rasgos, entre −1 y 1. Empieza en cero y se llena con el onboarding (6 duelos "¿Esta o esta?"), con Descubrir y con Ver. Cada acción mueve el perfil un poco hacia la película:

```
perfil nuevo = perfil + η × (señal × rasgo distintivo − perfil)
```

Solo se tocan los rasgos en que la película sobresale (más de 0,2): no se aprende de ausencias. Con el perfil se elige tu carta de perfil (arquetipo): El Romántico, El Nocturno, El Explorador, El Observador o El Luminoso.

### 3 · Moods: recetas personales

Un mood es una receta de rasgos. "Llorar bonito" es mucha carga emocional (+0,9), melancolía (+0,6), consuelo e intimidad (+0,4), y nada de oscuridad (−0,5) ni frenesí (−0,4). La receta es la semilla; lo que guardas y ves dentro de un mood mueve **tu versión** de esa receta.

### 4 · El puntaje

```
puntaje = β × parecido a ti + (1 − β) × parecido al mood + γ × calidad
```

- "Parecido" es el coseno: 1 si la película apunta hacia los mismos rasgos, 0 si no tiene que ver, −1 si es opuesta.
- γ vale 0,1 (0,35 en "Cine del bueno").
- β depende del momento:

| Situación | β |
|---|---|
| Sin mood | 1,0 (solo tú) |
| Con mood y perfil nuevo (menos de 15 señales) | 0,3 (manda el mood) |
| Con mood y perfil confiable | 0,5 (mitad y mitad) |

### 5 · El mazo: diez cartas, cuatro papeles

| Papel | Cuántas | Qué es |
|---|---|---|
| Afín | 6 | Las de mejor puntaje. La mejor abre el mazo y la segunda lo cierra |
| Creador | 2 | De un curador que sigues, o del equipo |
| Comodín | 1 | Comparte tu rasgo más fuerte, pero es distinta en lo demás |
| Sorpresa | 1 | Fuera de tu zona, pero muy bien valorada. Tiene tratamiento especial |

Además, el mazo no repite director, evita películas casi iguales y no repite durante 30 días lo que descartaste. Si en un día descartas mucho de un estilo, ese estilo baja.

### 6 · La explicación

Kinoo toma los dos rasgos que más aportaron (los que tú y la película comparten con más fuerza) y los pone en una frase del equipo: *"Encaja con tu gusto por historias íntimas y melancólicas."* Si una frase llegara a tener un número, el motor la cambia por una genérica.

### 7 · El aprendizaje

Lo que haces pesa distinto (fuerza = señal × η):

| Acción | Señal | η | Fuerza |
|---|---|---|---|
| Ver: "¡Obra maestra!" | +1,3 | 0,30 | +0,39 |
| Ver: "¡Me encantó!" | +1,0 | 0,25 | +0,25 |
| Ya la vi y me encantó | +1,0 | 0,20 | +0,20 |
| Onboarding: la que eliges | +0,8 | 0,20 | +0,16 |
| Ver: "Estuvo bien" | +0,4 | 0,15 | +0,06 |
| Quiero verla (sin voltear) | +0,5 | 0,08 | +0,04 |
| Quiero verla (volteada) | +0,4 | 0,08 | +0,032 |
| Ya la vi (sin decir más) | +0,2 | 0,03 | +0,006 |
| Ver: "← otra" | 0 | 0 | 0 |
| No me interesa | −0,3 | 0,10 | −0,03 |
| Onboarding: la que no eliges | −0,4 | 0,20 | −0,08 |
| Ver: "No era para mí" | −0,8 | 0,25 | −0,20 |

## Lo que ya probamos

Seis personas simuladas con un gusto oculto hicieron onboarding, 5 mazos y Ver cada noche (`npm run sim:perfiles`, detalle en [`SIMULACION-PERFILAMIENTO.md`](SIMULACION-PERFILAMIENTO.md)):

- **6 de 6** arquetipos correctos al segundo mazo.
- Perfil confiable en **13 a 24 señales** (uno o dos mazos).
- Primer mazo con onboarding: **5 a 8 aciertos de 10**. Al azar serían 2,6, y sin onboarding fueron 3.

## Lo que falta para que brille

- Poner los 6 duelos del onboarding en el front.
- Un catálogo más grande: con 69 películas, a un gusto definido se le acaban las suyas al cuarto mazo.
- Que el minijuego "¿Esto o aquello?" y "¿Qué versión de ti salió?" manden señal (ver [`PREGUNTAS-RECOLECCION-DE-DATOS.md`](PREGUNTAS-RECOLECCION-DE-DATOS.md)).
- Ajustar los pesos con personas reales.

## Ejemplo con números

Ana tiene 0,30 de gusto por lo melancólico. *Vidas pasadas* tiene un rasgo distintivo melancólico de 0,91.

1. **La guarda en Descubrir, después de voltearla** (señal +0,4, η 0,08). El objetivo es 0,4 × 0,91 = 0,364, y su perfil queda en 0,30 + 0,08 × (0,364 − 0,30) = **0,305**. Es una intención: sube poco.
2. **La ve y dice "Me encantó"** (señal +1,0, η 0,25). El objetivo es 0,91, y su perfil queda en 0,305 + 0,25 × (0,91 − 0,305) = **0,456**. Cumplió fuera de la app: sube mucho.
3. **Su próximo mazo de "Llorar bonito"** tiene menos de 15 señales, así que usa β = 0,3: el mood pesa 70 % y su perfil, 30 %. A medida que guarda y ve más, su perfil pasa a pesar la mitad.

Datos de películas: TMDB. Este producto usa la API de TMDB, pero TMDB no lo respalda ni lo certifica.
