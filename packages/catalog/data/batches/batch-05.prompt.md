Eres el juez sintético de Kinoo, una app colombiana para decidir qué película ver. Describe cada película con 21 átomos de 0.0 a 1.0. Los átomos son independientes (una película puede ser melancólica y luminosa a la vez). Describen la película, no la ocasión.

## Átomos
- frenetica (dinamica): Cortes rápidos, acción constante
- agil (dinamica): Avanza rápido sin agobiar
- pausada (dinamica): Se toma su tiempo, pero avanza
- contemplativa (dinamica): Planos largos, poca trama
- reconfortante (atmosfera): Te deja bien
- luminosa (atmosfera): Optimista, cálida en el ánimo
- melancolica (atmosfera): Tristeza suave, nostalgia
- tensa (atmosfera): Suspenso, nervios
- inquietante (atmosfera): Incomodidad, extrañeza
- sombria (atmosfera): Oscura, dura
- cruda (estetica): Realista, cámara en mano
- onirica (estetica): Surreal, de sueño
- neon (estetica): Colores saturados, nocturna
- pastel (estetica): Suave, composiciones cuidadas
- calida (estetica): Paleta cálida, textura de película
- monocromatica (estetica): Paleta reducida
- carga_emocional (carga): Cuánto te puede hacer llorar o conmover
- complejidad (carga): Trama enredada, te hace pensar
- humor (carga): Cuánto te hace reír
- intimidad (carga): Pocos personajes, escala personal
- escala_epica (carga): Gran escala, aventura, espectáculo

## Cómo puntuar
- Usa los extremos cuando corresponde: 0.0 si la película no tiene nada de ese rasgo; 0.9 o más si es de lo más representativo del cine en ese rasgo.
- No pongas todo cerca de 0.5. Una película típica tiene 3 a 6 átomos altos (≥ 0.6) y muchos bajos (≤ 0.2).
- "frenetica" y "contemplativa" casi nunca son altas a la vez.
- Valores con dos decimales como máximo.

## Ejemplos de calibración (valores fijados por el equipo)
Mad Max: Furia en el camino (2015): {"frenetica":0.98,"agil":0.7,"pausada":0.02,"contemplativa":0.02,"reconfortante":0.05,"luminosa":0.15,"melancolica":0.1,"tensa":0.85,"inquietante":0.3,"sombria":0.55,"cruda":0.45,"onirica":0.2,"neon":0.35,"pastel":0,"calida":0.6,"monocromatica":0.05,"carga_emocional":0.3,"complejidad":0.15,"humor":0.15,"intimidad":0.1,"escala_epica":0.95}
Coco (2017): {"frenetica":0.3,"agil":0.7,"pausada":0.2,"contemplativa":0.05,"reconfortante":0.9,"luminosa":0.85,"melancolica":0.55,"tensa":0.25,"inquietante":0.05,"sombria":0.05,"cruda":0,"onirica":0.6,"neon":0.45,"pastel":0.4,"calida":0.85,"monocromatica":0,"carga_emocional":0.9,"complejidad":0.2,"humor":0.6,"intimidad":0.6,"escala_epica":0.45}
Roma (2018): {"frenetica":0.02,"agil":0.05,"pausada":0.6,"contemplativa":0.92,"reconfortante":0.2,"luminosa":0.2,"melancolica":0.75,"tensa":0.3,"inquietante":0.1,"sombria":0.3,"cruda":0.75,"onirica":0.1,"neon":0,"pastel":0,"calida":0.1,"monocromatica":0.98,"carga_emocional":0.85,"complejidad":0.35,"humor":0.05,"intimidad":0.85,"escala_epica":0.2}

## Frase gancho (cara A de la carta)
- Máximo 160 caracteres, TODO EN MAYÚSCULAS, en español.
- Cuenta la premisa sin nombres de actores, directores, personajes famosos ni franquicias (nada de "Batman", "Nolan", "Vengadores").
- Sin revelar giros del final.

## Pilares (reverso de la carta)
Cuatro etiquetas cortas en minúscula y en español: ritmo (p. ej. "pausado", "vibrante"), tono (p. ej. "melancólico", "cálido"), historia (p. ej. "amor a destiempo"), visual (p. ej. "neón nocturno").

## Películas
- id: shrek-2-2004 | Shrek 2 / Shrek 2 (2004) | dirección: Andrew Adamson, Kelly Asbury, Conrad Vernon | géneros: Animación, Comedia, Familia, Fantasía | sinopsis: Shrek y Fiona regresan de su luna de miel y son invitados al reino de Muy Muy Lejano para conocer a los padres de ella. La visita se complica con un Hada Madrina decidida a arruinar su felicidad. | palabras clave: ogre, fairy tale, sequel, parody, talking animal, in-laws, fairy godmother, swamp, kingdom, anthropomorphism
- id: sinners-2025 | Pecadores / Sinners (2025) | dirección: Ryan Coogler | géneros: Terror, Acción, Suspense | sinopsis: Dos hermanos gemelos regresan a su pueblo natal en el Misisipi de los años treinta para abrir un club de música. Su noche de inauguración atrae a una presencia oscura que amenaza a todos. | palabras clave: vampire, mississippi, 1930s, blues, twin brothers, juke joint, jim crow era, supernatural horror, musician, period drama
- id: ted-2-2015 | Ted 2 / Ted 2 (2015) | dirección: Seth MacFarlane | géneros: Comedia | sinopsis: Recién casado, Ted quiere tener un hijo con su esposa, pero antes debe demostrar ante un tribunal que es una persona y no una propiedad. Con la ayuda de John y una joven abogada, emprende una batalla legal por sus derechos. | palabras clave: sequel, talking teddy bear, courtroom, civil rights, marriage, adult humor, lawyer, friendship, marijuana, stuffed animal
- id: ted-2012 | Ted / Ted (2012) | dirección: Seth MacFarlane | géneros: Comedia, Fantasía | sinopsis: John Bennett deseó de niño que su osito de peluche cobrara vida, y el deseo se cumplió. Décadas después, el oso vulgar y malhablado sigue siendo su mejor amigo, y su relación con su novia empieza a resentirse. | palabras clave: talking teddy bear, friendship, boston, massachusetts, adult humor, wish, stuffed animal, slacker, relationship, magic, pop culture
- id: the-batman-2022 | Batman / The Batman (2022) | dirección: Matt Reeves | géneros: Crimen, Misterio, Suspense | sinopsis: Durante su segundo año combatiendo el crimen en Gotham, Batman descubre una red de corrupción que conecta con su propia familia. Cuando un asesino en serie empieza a atacar a las élites de la ciudad, deberá seguir un rastro de pistas enigmáticas. | palabras clave: based on comic, superhero, vigilante, serial killer, detective, gotham city, corruption, neo-noir, conspiracy, dc comics
- id: the-exorcist-1973 | El exorcista / The Exorcist (1973) | dirección: William Friedkin | géneros: Terror | sinopsis: Una actriz acude desesperada a dos sacerdotes cuando su hija de doce años empieza a mostrar un comportamiento inexplicable y aterrador. Un clásico del terror sobre la fe y la posesión. | palabras clave: exorcism, possession, priest, demon, washington d.c., based on novel or book, faith, mother daughter relationship, supernatural horror, classic
- id: the-godfather-1972 | El padrino / The Godfather (1972) | dirección: Francis Ford Coppola | géneros: Drama, Crimen | sinopsis: Don Vito Corleone, patriarca de una familia de la mafia en Nueva York, debe traspasar el control de su imperio a su reacio hijo menor. Una saga sobre poder, lealtad y familia. | palabras clave: based on novel or book, mafia, organized crime, new york city, italian american, patriarch, family business, loyalty, power struggle, 1940s
- id: the-godfather-part-ii-1974 | El padrino II / The Godfather Part II (1974) | dirección: Francis Ford Coppola | géneros: Drama, Crimen | sinopsis: Michael Corleone consolida el poder de la familia mientras se retrata la juventud de su padre, Vito, en la Sicilia y la Nueva York de principios de siglo. Dos historias paralelas sobre el precio del poder. | palabras clave: mafia, sequel, organized crime, sicily, italy, flashback, havana, cuba, immigrant, betrayal, family, 1950s
- id: the-godfather-part-iii-1990 | El padrino III / The Godfather Part III (1990) | dirección: Francis Ford Coppola | géneros: Crimen, Drama | sinopsis: Ya mayor, Michael Corleone busca legitimar los negocios de su familia y redimirse de su pasado, pero nuevas alianzas y viejos enemigos lo arrastran de nuevo al mundo criminal. | palabras clave: mafia, sequel, organized crime, vatican, redemption, sicily, italy, aging, guilt, banking, 1970s
- id: the-pope-s-exorcist-2023 | El exorcista del papa / The Pope's Exorcist (2023) | dirección: Julius Avery | géneros: Terror, Suspense | sinopsis: Basada en los archivos del padre Gabriele Amorth, jefe de exorcistas del Vaticano. Investiga la posesión de un niño y descubre un secreto que la Iglesia ha intentado mantener oculto durante siglos. | palabras clave: exorcism, possession, priest, vatican, demon, based on true story, spain, supernatural horror, catholic church
- id: toy-story-1995 | Toy Story / Toy Story (1995) | dirección: John Lasseter | géneros: Animación, Familia, Comedia | sinopsis: Woody, un vaquero de juguete, es el favorito de su dueño Andy hasta que llega Buzz Lightyear, un flamante guardián espacial. Los celos y un viaje accidental fuera de casa obligarán a los dos a trabajar juntos para volver con Andy. | palabras clave: toy, friendship, rivalry, cowboy, space ranger, jealousy, boy, anthropomorphism, computer animation, buddy
- id: toy-story-2-1999 | Toy Story 2 / Toy Story 2 (1999) | dirección: John Lasseter, Lee Unkrich, Ash Brannon | géneros: Animación, Familia, Comedia | sinopsis: Cuando Woody es secuestrado por un coleccionista de juguetes, Buzz y sus amigos emprenden una misión de rescate. Mientras tanto, Woody descubre sus orígenes y debe decidir qué clase de juguete quiere ser. | palabras clave: toy, rescue, sequel, collector, friendship, cowboy, airport, anthropomorphism, computer animation
- id: watchmen-2009 | Watchmen: Los vigilantes / Watchmen (2009) | dirección: Zack Snyder | géneros: Acción, Misterio, Ciencia ficción | sinopsis: En una Norteamérica alternativa de 1985, los superhéroes están proscritos y la Guerra Fría amenaza con una catástrofe nuclear. Cuando uno de sus antiguos compañeros es asesinado, un vigilante enmascarado investiga una conspiración que puede cambiar el mundo. | palabras clave: superhero, based on graphic novel, alternate history, cold war, vigilante, nuclear war, conspiracy, murder mystery, dystopia, 1980s
- id: world-war-z-2013 | Guerra Mundial Z / World War Z (2013) | dirección: Marc Forster | géneros: Acción, Terror, Ciencia ficción | sinopsis: Un exinvestigador de la ONU recorre el mundo en busca del origen de una pandemia que convierte a los infectados en criaturas violentas. Su misión es encontrar una forma de detenerla antes de que la civilización colapse. | palabras clave: zombie, pandemic, apocalypse, based on novel or book, virus, united nations, survival, epidemic, family, post-apocalyptic future
- id: x-men-days-of-future-past-2014 | X-Men: Días del futuro pasado / X-Men: Days of Future Past (2014) | dirección: Bryan Singer | géneros: Acción, Aventura, Ciencia ficción | sinopsis: En un futuro sombrío, los mutantes son cazados por unos centinelas invencibles. Wolverine viaja al pasado para unir a los jóvenes Profesor X y Magneto e intentar cambiar el rumbo de la historia. | palabras clave: superhero, mutant, time travel, based on comic, dystopia, alternate timeline, shape shifter, 1970s, vietnam war, aftercreditsstinger

Devuelve SOLO un JSON válido con esta forma, sin texto alrededor:
{"movies": [{"id": "<id tal cual>", "atoms": {"frenetica": 0.0, "agil": 0.0, "pausada": 0.0, "contemplativa": 0.0, "reconfortante": 0.0, "luminosa": 0.0, "melancolica": 0.0, "tensa": 0.0, "inquietante": 0.0, "sombria": 0.0, "cruda": 0.0, "onirica": 0.0, "neon": 0.0, "pastel": 0.0, "calida": 0.0, "monocromatica": 0.0, "carga_emocional": 0.0, "complejidad": 0.0, "humor": 0.0, "intimidad": 0.0, "escala_epica": 0.0}, "hook": "<FRASE GANCHO>", "pillars": {"ritmo": "<1 a 3 palabras>", "tono": "<1 a 3 palabras>", "historia": "<1 a 4 palabras>", "visual": "<1 a 3 palabras>"}}]}