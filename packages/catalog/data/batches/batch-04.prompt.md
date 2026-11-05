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
- id: corpse-bride-2005 | El cadáver de la novia / Corpse Bride (2005) | dirección: Tim Burton, Mike Johnson | géneros: Animación, Fantasía, Romance | sinopsis: Víctor, un joven tímido a punto de casarse, ensaya sus votos en el bosque y sin querer compromete su mano con una novia fallecida. Lo arrastra al mundo de los muertos, más alegre que el de los vivos. | palabras clave: stop motion, wedding, afterlife, undead, arranged marriage, love triangle, musical, gothic, dark fantasy, victorian era
- id: cuando-acecha-la-maldad-2023 | Cuando acecha la maldad / Cuando acecha la maldad (2023) | dirección: Demián Rugna | géneros: Terror | sinopsis: En una zona rural de Argentina, dos hermanos encuentran un cuerpo gravemente poseído por una entidad maligna. Al intentar deshacerse de él, liberan una fuerza que amenaza a todo el pueblo. | palabras clave: demonic possession, rural, argentina, supernatural horror, gore, brothers, evil, demon, countryside, folk horror
- id: dune-2021 | Duna / Dune (2021) | dirección: Denis Villeneuve | géneros: Ciencia ficción, Aventura | sinopsis: Paul Atreides, un joven brillante y talentoso, nace con un gran destino que está más allá de su comprensión. Debe viajar al planeta más peligroso del universo para asegurar el futuro de su familia y su pueblo. | palabras clave: based on novel or book, desert, space opera, chosen one, prophecy, royal family, giant worm, distant future, epic, war
- id: dune-part-two-2024 | Duna: Parte dos / Dune: Part Two (2024) | dirección: Denis Villeneuve | géneros: Ciencia ficción, Aventura | sinopsis: Paul Atreides se une a Chani y a los Fremen mientras busca venganza contra quienes destruyeron a su familia. Enfrentado a una decisión entre el amor de su vida y el destino del universo, intenta evitar un futuro terrible. | palabras clave: based on novel or book, desert, space opera, revenge, prophecy, giant worm, rebellion, sequel, epic, distant future
- id: get-out-2017 | ¡Huye! / Get Out (2017) | dirección: Jordan Peele | géneros: Misterio, Suspense, Terror | sinopsis: Chris, un joven fotógrafo afroamericano, viaja a conocer a la familia de su novia en una finca apartada. Lo que al principio parece una visita incómoda se convierte en un descubrimiento perturbador. | palabras clave: racism, hypnosis, interracial relationship, psychological thriller, social commentary, photographer, meeting the parents, suburbia, paranoia, satire
- id: grease-1978 | Grease (Vaselina) / Grease (1978) | dirección: Randal Kleiser | géneros: Romance, Comedia, Música | sinopsis: Danny Zuko y Sandy Olsson se enamoran durante el verano. Al reencontrarse en el instituto, deberán lidiar con las presiones de su grupo de amigos y con las apariencias para poder estar juntos. | palabras clave: based on musical, high school, 1950s, summer romance, teenage love, rock 'n' roll, drag race, gang, new student, dance
- id: halloween-2018 | Halloween / Halloween (2018) | dirección: David Gordon Green | géneros: Terror, Suspense | sinopsis: Cuarenta años después de la noche en que Michael Myers aterrorizó Haddonfield, Laurie Strode se ha preparado para un nuevo enfrentamiento. Cuando el asesino enmascarado regresa, la lucha de tres generaciones de mujeres comienza. | palabras clave: slasher, serial killer, halloween, sequel, masked killer, survivor, babysitter, small town, trauma, grandmother granddaughter relationship
- id: marty-supreme-2025 | Marty Supreme / Marty Supreme (2025) | dirección: Josh Safdie | géneros: Drama, Comedia | sinopsis: Marty Mauser, un joven ambicioso y sin filtros de la Nueva York de los años cincuenta, persigue su sueño de convertirse en campeón mundial de tenis de mesa. Para lograrlo está dispuesto a todo, sin importar a quién tenga que arrastrar consigo. | palabras clave: table tennis, new york city, 1950s, ambition, hustler, sports, dark comedy, obsession, tournament
- id: mickey-17-2025 | Mickey 17 / Mickey 17 (2025) | dirección: Bong Joon-ho | géneros: Ciencia ficción, Comedia, Aventura | sinopsis: Mickey, un trabajador prescindible en una expedición para colonizar un planeta helado, es enviado a misiones mortales y regenerado una y otra vez. Todo se complica cuando una versión suya aparece mientras la anterior sigue con vida. | palabras clave: based on novel or book, clone, space colony, ice planet, dark comedy, expendable worker, satire, dictator, reincarnation, alien creature
- id: mortal-kombat-2021 | Mortal Kombat / Mortal Kombat (2021) | dirección: Simon McQuoid | géneros: Acción, Fantasía, Aventura | sinopsis: Cole Young, un luchador de MMA acostumbrado a perder, descubre que lleva una misteriosa marca de nacimiento. Perseguido por el letal Sub-Zero, busca a los mejores guerreros de la Tierra para enfrentarse a los campeones de otro reino. | palabras clave: based on video game, martial arts, tournament, fighting, ninja, mixed martial arts, fatality, sorcerer, gore, reboot
- id: mortal-kombat-ii-2026 | Mortal Kombat II / Mortal Kombat II (2026) | dirección: Simon McQuoid | géneros: Acción, Fantasía, Aventura | sinopsis: Los campeones de la Tierra se preparan para el torneo de Mortal Kombat, donde deberán enfrentarse a los luchadores del Mundo Exterior. Esta vez, Johnny Cage se suma al equipo con la misión de proteger el reino. | palabras clave: based on video game, martial arts, tournament, sequel, fighting, gore, sorcerer, parallel world, supernatural
- id: ratatouille-2007 | Ratatouille / Ratatouille (2007) | dirección: Brad Bird | géneros: Animación, Comedia, Familia | sinopsis: Remy, una rata con un talento extraordinario para la cocina, sueña con ser chef en París. Su improbable alianza con un joven pinche de cocina cambiará la vida de ambos. | palabras clave: paris, france, rat, chef, restaurant, cooking, food, food critic, anthropomorphism, kitchen, dream
- id: rocky-balboa-2006 | Rocky Balboa / Rocky Balboa (2006) | dirección: Sylvester Stallone | géneros: Drama | sinopsis: Años después de retirarse, Rocky Balboa dirige un pequeño restaurante en Filadelfia y vive con el recuerdo de su esposa. Una pelea simulada por computador lo empuja a volver al cuadrilátero para enfrentar al campeón actual. | palabras clave: boxing, philadelphia, pennsylvania, sequel, comeback, boxer, widower, father son relationship, aging, underdog, las vegas
- id: rocky-ii-1979 | Rocky II / Rocky II (1979) | dirección: Sylvester Stallone | géneros: Drama | sinopsis: Tras su combate contra Apollo Creed, Rocky Balboa intenta rehacer su vida junto a Adrian, pero la fama no le resulta sencilla. Un nuevo desafío lo empuja de vuelta al ring para una revancha. | palabras clave: boxing, sequel, philadelphia, pennsylvania, rematch, underdog, boxer, training, heavyweight champion, marriage, sports
- id: rocky-iii-1982 | Rocky III / Rocky III (1982) | dirección: Sylvester Stallone | géneros: Drama | sinopsis: Rocky Balboa, ya campeón mundial, disfruta de la fama hasta que un joven y feroz aspirante lo desafía. Para recuperar la fuerza y el hambre de pelear deberá apoyarse en un antiguo rival. | palabras clave: boxing, sequel, philadelphia, pennsylvania, boxer, training, rematch, world champion, underdog, friendship
- id: scarface-1983 | Scarface: El precio del poder / Scarface (1983) | dirección: Brian De Palma | géneros: Crimen, Drama | sinopsis: Tony Montana, un refugiado cubano en Miami, se abre camino en el mundo del narcotráfico con ambición y violencia. Su ascenso meteórico lo lleva a la cima, pero el poder tiene un precio. | palabras clave: cuban, miami, drug dealer, cocaine, organized crime, gangster, american dream, remake, 1980s, drug cartel

Devuelve SOLO un JSON válido con esta forma, sin texto alrededor:
{"movies": [{"id": "<id tal cual>", "atoms": {"frenetica": 0.0, "agil": 0.0, "pausada": 0.0, "contemplativa": 0.0, "reconfortante": 0.0, "luminosa": 0.0, "melancolica": 0.0, "tensa": 0.0, "inquietante": 0.0, "sombria": 0.0, "cruda": 0.0, "onirica": 0.0, "neon": 0.0, "pastel": 0.0, "calida": 0.0, "monocromatica": 0.0, "carga_emocional": 0.0, "complejidad": 0.0, "humor": 0.0, "intimidad": 0.0, "escala_epica": 0.0}, "hook": "<FRASE GANCHO>", "pillars": {"ritmo": "<1 a 3 palabras>", "tono": "<1 a 3 palabras>", "historia": "<1 a 4 palabras>", "visual": "<1 a 3 palabras>"}}]}