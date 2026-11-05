# Progreso

## Estado actual
- Fase: F10 · Límites de texto en toda la app, preguntas de recolección de datos y explicación gráfica del algoritmo
- Última tarea terminada: F7 · estructura nueva, base de datos portátil, API HTTP, simulación de TMDB con 69 películas, pósters y documentación
- Siguiente tarea: el equipo responde `docs/PREGUNTAS-RECOLECCION-DE-DATOS.md`; subir los pósters que faltan (ver abajo)
- Bloqueos: sin `TMDB_API_KEY` (el catálogo usa la simulación de TMDB, que corre el mismo pipeline sin red)
- Pull requests: montenegroc597-web/Prototipo-Kinoo#1 (fusionado), montenegroc597-web/Prototipo-Kinoo#2 (arreglo del despliegue), y el de F7
- Última actualización: 2026-11-05 09:30

## Fases
| Fase | Estado | Comprobación |
|---|---|---|
| F0 | ✅ | Línea base: 0 unitarias, 0 e2e (el repositorio no tenía pruebas). Inventario abajo |
| F1 | ✅ | 86/86 rutas publicadas en `site/`; 86 archivos movidos con `git mv` sin cambios de contenido; typecheck limpio; 1/1 unitaria y 1/1 e2e (rutas) |
| F2 | ✅ | 6 migraciones aplicadas desde cero en PGlite + pgvector; 10/10 pruebas (RLS de eventos y perfiles, solo agregar, votos, exportar y borrar) |
| F3 | ✅ | 35/35 unitarias del motor; 5/5 pruebas de simulación (Aprende 6,4× el azar; moods coseno 0,64 y 20 % compartido; cambio en 22 eventos en el peor caso; 0 explicaciones con números; 181/181 mazos respetan la receta). Total del repo 51/51 |
| F4 | ✅ (semilla) | 34 películas válidas (no 300: bloqueo anotado); 0 errores de esquema y frases gancho; dispersión ≥ 0,21 en los 21 átomos; 0 contradicciones; error de anclas 0,052 (anclas provisionales); CSV de 20 para revisión |
| F5 | ✅ | 56/56 unitarias (incluye API de punta a punta sobre PGlite con RLS); 3/3 e2e: mazo del motor → guardar → Ver → "Me encantó" cambia el perfil; sin motor, el prototipo sigue igual; 86/86 rutas |
| F10 | ✅ | Límites de caracteres por pantalla (`guias/limites-de-texto.md`); auditoría en el navegador sin textos fuera de su caja ni montados en frente, reverso, ficha ADN y Ver de las 69 películas y en las pantallas fijas; 123/123 unitarias e integración y 10/10 e2e; documento de preguntas; explicación gráfica (`presentacion/como-funciona-kinoo.html`) y su versión md |
| F9 | ✅ | Estándar de caracteres de la carta (`display.*`, `card_*_max`); 0 textos fuera del borde en las 69 películas (`cartas.spec.ts`); 90 pilares acortados; póster de Rocky corregido; vista en PC centrada sobre fondo café; 122/122 y 7/7 e2e |
| F8 | ✅ | Inicio de sesión camilo/1234 (6/6 e2e); simulación de Camilo en la app (4 mazos por la interfaz real) y de 6 tipos de usuario; `docs/SIMULACION-PERFILAMIENTO.md`; 118/118 unitarias e integración |
| F7 | ✅ | 116/116 unitarias e integración (migraciones y RLS con los dos proveedores, API HTTP con JWT, simulación de TMDB); 3/3 e2e; 86/86 rutas; lint y tipos limpios |
| F6 | ✅ | Documentos enlazados entre sí (0 enlaces rotos); PR abierto: https://github.com/montenegroc597-web/Prototipo-Kinoo/pull/1 (sin fusionar). **Plan completo** |

## Inventario del repositorio (F0)
- **Tecnología:** HTML estático. Cada pantalla es un archivo `.dc.html` que dibuja `public/_prototipos/dc-runtime.js`. No hay `package.json`, build ni pruebas.
- **Pantallas:** Descubrir = `Flujo1_Descubrir` (mazo de 10 cartas, datos escritos en la pantalla), `Flujo2_Resumen`, `Flujo2b_Ticket`, `Flujo2c_Perfil`, `Flujo3_Minijuego`, `Flujo4_Eleccion`, `Flujo5_Inicio`. Ver = `FlujoV1_Feed` a `FlujoV6_Gracias`.
- **Imágenes:** `public/kinoo-flujo/_blob/` (nombres con hash: no se renombran).
- **Despliegue:** `.github/workflows/deploy.yml` publica `public/` en GitHub Pages con cada push a `main`.
- **Supabase:** no se usa en este repositorio.
- **Pruebas:** ninguna. Las "126 unitarias y 17 e2e" del plan son de `kinoo-pruebas`. Ahí se midieron 67 unitarias en verde el 2026-11-05 (solo lectura, sin cambios).

## Bitácora
- 2026-11-05 03:40 · F0 · Diagnóstico. El plan describe `kinoo-pruebas`, pero Camilo indicó construir en `Prototipo-Kinoo` y no tocar `kinoo-pruebas`. Ver `adr/0001-estructura.md`.

- 2026-11-05 03:55 · F1 · `public/` → `apps/web/` con `git mv`. Build a `site/`, `check:site`, CI nueva. Ver `adr/0002-monorepo.md`.
- 2026-11-05 04:10 · F2 · Configuración en `data/config/*.json` → `npm run seed` → `supabase/seed/`. 6 migraciones y pruebas sobre PGlite.
- 2026-11-05 04:30 · F3 · Módulos del motor escritos. Por indicación de Camilo, las cartas de tarot pasan a ser **arquetipos de perfil** (misma idea, sin mencionar el tarot): tabla `archetypes`, `data/config/archetypes.json`.
- 2026-11-05 05:10 · F3 · Simulador (`npm run sim`). Con los valores iniciales fallaba "Responde al cambio" (peor caso 62 eventos): el mazo insistía en lo descartado y nunca mostraba el gusto nuevo. Se agregó la fatiga de descarte y se ajustaron dos valores en la configuración (abajo). Resultado: 5/5.
- 2026-11-05 05:40 · F4 · Pipeline `scripts/catalog/` (fetch-tmdb, tag, build). Semilla manual de 34 películas, etiquetada por dos subagentes Sonnet. QC aprobado.
- 2026-11-05 06:05 · F5 · `packages/api`: un solo servicio para las Edge Functions y el modo demo. Cinco endpoints en `supabase/functions/` (events, deck, watch, onboarding). Prueba de punta a punta contra PGlite con RLS.
- 2026-11-05 06:40 · F5 · Modo demo (`_kinoo/kinoo-demo.js`) y conexión de `Flujo1_Descubrir`, `FlujoV1_Feed` y `FlujoV4_Calificar`. Ver `adr/0003-api-y-modo-demo.md` y `guias/contrato-api.md`.
- 2026-11-05 07:00 · F6 · `docs/README.md`, guía para ajustar el algoritmo, guía de despliegue, README raíz. Pull request hacia `main` (sin fusionar).
- 2026-11-05 04:15 · Arreglo · El despliegue de `main` fallaba: `package-lock.json` no incluía el paquete `packages/api`. PR #2 lo regenera. La CI también fallaba porque Playwright no soporta Ubuntu 26.04: las e2e pasan a `ubuntu-24.04`.
- 2026-11-05 05:40 · F7 · Pedido de Camilo: separar front y back con estándares actuales, dejar la base lista para Supabase u otra nube, fortalecer las pruebas, simular TMDB y documentar. Ver `adr/0004-front-back-y-nube.md` y `ARQUITECTURA.md`.
- 2026-11-05 06:00 · F8 · El PR #3 se fusionó antes que el #2. Como el #3 ya traía el arreglo del lock y de Ubuntu, el #2 se dejó sin diferencias con `main` (se puede cerrar). El despliegue sigue fallando porque GitHub Pages no está activado en el repositorio: paso manual en `guias/despliegue.md`.
- 2026-11-05 06:30 · F8 · Inicio de sesión de la demo, simulación de perfilamiento y dos ajustes que salieron de ella (cierre del mazo y frase del curador).
- 2026-11-05 07:10 · F9 · Pedido de Camilo: la sinopsis del reverso se salía del borde. Se definió un estándar de caracteres para todos los textos de la carta, se corrigieron los pósters y la vista en PC.
- 2026-11-05 09:30 · F10 · Pedido de Camilo: revisar todos los textos de la app. Límites en `params.json`, ficha ADN con frase y temas de la película (migración 0008), Ver con título en una línea, cierre del mazo neutro con menos de 2 guardadas, pilares a 15 caracteres. Documento de preguntas para recolectar datos desde el front (minijuego, momentos clave, versión, super like…) y explicación gráfica del algoritmo.

## Decisiones tomadas sin Camilo
- La línea base es 0/0 porque el prototipo no tenía pruebas. Las pruebas nuevas son las primeras del repositorio.

- Se publica `site/` (copia de `apps/web/` + modo demo) en vez de `public/`. Las rutas no cambian y la fuente de Pages sigue siendo GitHub Actions.
- Para las e2e en la sesión en la nube se usa el Chromium preinstalado (`PW_CHROMIUM_PATH`). En CI, Playwright instala el suyo.
- **Moods del piloto:** 7, unificando el carrete de Ver: Llorar bonito, Apagar el cerebro, Escapar un rato, Salir pensando, Solo reírme, Algo raro y Cine del bueno. "Sufrir bonito" y "Sentir algo" quedan como alias de "Llorar bonito" (la fusión sigue pendiente, como dice la especificación). Las recetas semilla, menos la de Llorar bonito, son propuestas mías.
- **`marked_seen` con reacción:** la especificación dice que la reacción es opcional, pero solo da el peso sin reacción. Agregué tres variantes (`loved` +1,0/0,20; `liked` +0,4/0,10; `not_for_me` −0,6/0,15), un poco más suaves que `watch_confirmed` porque la vio antes de Kinoo.
- **Mano vacía sin números:** el ejemplo de la especificación ("esta dura 1 h 52") tiene números. Para cumplir la regla dura, el aviso dice "No tienes nada tan corto en tu mano; esta es un poco más larga". La duración de la película sigue a la vista en la carta.
- **Calidad:** `calidad(m)` es un promedio bayesiano de la nota de TMDB: `(v·R + 500·6,5) / (v + 500) / 10`.
- **Plataformas del usuario:** se guardan en `profiles.providers` y con un evento `platforms_set` (nuevo, no estaba en la tabla de eventos).
- **Borrado de datos:** `kinoo_delete_my_data()` es la única vía que puede borrar eventos, por la Ley 1581.
- **Nombres de los arquetipos:** El Explorador, El Observador, El Romántico, El Nocturno y El Luminoso (antes El Loco, El Ermitaño, Los Amantes, La Luna y La Estrella). Son una propuesta; se cambian en `data/config/archetypes.json`.
- **Fatiga de descarte (nuevo):** lo que se parece mucho a algo descartado en las últimas 24 h baja en el mazo: `− 0,3 × coseno`. Es la lectura de "hoy no". Parámetros `dismiss_fatigue_weight` y `dismiss_fatigue_hours`.
- **Ajustes de configuración por el simulador:** `dismissed` η pasó de 0,03 a 0,10 y `sorpresa_min_cosine` de −0,1 a −0,5. Probé 14 combinaciones; esta es la única que pasa las cinco pruebas en el catálogo de referencia.
- **"Responde al cambio" es frágil:** con otras dos semillas del catálogo sintético, el peor caso fue 33 y 34 eventos (el promedio, 20). Pasa en el catálogo de referencia y en promedio, pero no siempre en el peor usuario. Hay que volver a medirlo con el catálogo real y con datos de uso.
- **β con poca confianza:** el 0,3 se aplica solo cuando hay mood. Sin mood no hay receta con la cual compensar, así que el perfil vacío deja que pese la calidad.
- **Explicación sin rasgos en común:** si el perfil existe pero no comparte nada con la película, la frase es "Algo distinto a lo que sueles guardar, para ampliar el mazo." (plantilla `no_overlap`, nueva).
- **Sorpresa "media o baja":** puntaje en el 60 % inferior de las candidatas (`sorpresa_max_score_percentile`).
- **Comodín:** el rasgo favorito tiene que valer al menos 0,4 en la película (`comodin_min_top_atom`).
- **Semilla de 34, no de 30:** 30 no alcanzaba para cumplir las cuotas (20 % anteriores al 2000, 15 % latinoamericanas) e incluir todas las películas del prototipo.
- **Metadatos de la semilla escritos a mano:** duración, nota, votos y plataformas en Colombia son aproximados. Los `tmdb_id` quedaron vacíos para no inventarlos.
- **Anclas provisionales:** las 6 anclas las propuse yo. Su error bajo (0,052) mide coherencia del juez, no acuerdo con el equipo.
- **Mazo del Equipo Kinoo provisional:** 12 películas con 5 notas escritas por mí. Hay que curarlo.
- **Pósters:** donde el prototipo ya tenía imagen, `poster_path` apunta a `_blob/…`; las demás no tienen póster.
- **`packages/api` (nuevo, no estaba en el plan):** la lógica de los endpoints vive aquí una sola vez y la usan las Edge Functions y el modo demo. Ver `adr/0003-api-y-modo-demo.md`.
- **Edge Functions sin probar en Deno:** la sesión no tiene Deno ni proyecto de Supabase. Se probó la misma lógica en Node contra PGlite. Antes de desplegar hay que correr `npm run build:functions` (empaqueta el motor en `_shared/kinoo-core.js`).
- **"93 % contigo" oculto con el motor:** el principio 1 prohíbe mostrar porcentajes. En su lugar, la carta muestra la explicación en palabras al pie. Sin el motor, la carta se ve como antes.
- **Premisa corta en la carta:** la carta está diseñada para unas 40 letras y el juez escribe hasta 160. En la demo se muestra la primera parte de la frase gancho con "…". Hay que decidir si el juez escribe además una premisa corta, o si cambia el diseño.
- **Gestos → acciones:** "Quiero verla" = `saved_intent`, "No me interesa" = `dismissed`, "Ya la vi" = `marked_seen`, tocar para revelar = `card_flipped`. En Ver: "otra" = `watch_skipped`, "Abrir en…" = `watch_started`. En Calificar, los cinco niveles se traducen así: Me dormí y No era para mí = `not_for_me`; Estuvo bien = `liked`; Me encantó = `loved`; Obra maestra = `loved` + `rewatch`.
- **Super like en Ver:** no tiene acción en el back. La especificación no lo define y no quise inventarle un peso.
- **Tono del reverso:** el prototipo tiene ilustraciones para cuatro tonos (melancólico, nostálgico, oscuro, cálido). El puente elige el más cercano según los átomos; el tono del juez queda como subtítulo.
- **Onboarding sin pantallas:** el prototipo no tiene pantallas de onboarding. El endpoint existe y está probado, pero en la demo el perfil empieza vacío y aprende desde el primer mazo.
- **F7 · Ids de película nuevos:** ahora salen de TMDB como `titulo-original-año` (`the-godfather-1972`, `parasitos-2019`). Los eventos guardados en el navegador con ids viejos se ignoran.
- **F7 · Catálogo de 69 películas simuladas:** las 34 de antes más 35 de los pósters que mandaste. 13 tienen id de TMDB sin verificar (`_id_verificado: false`); se corrigen con la API real.
- **F7 · "% contigo" en Ver:** con el motor, la insignia dice "de tu mano" en vez de un porcentaje. Resumen y Perfil todavía muestran porcentajes de ejemplo porque no están conectados.
- **F7 · Supabase sin dependencias:** el back habla con Supabase por REST (fetch) y verifica JWT con WebCrypto. No usa `@supabase/supabase-js`.
- **F7 · Una migración nueva (0007)** en vez de editar la 0002, porque las publicadas no se editan.
- **F8 · Inicio de sesión de la demo:** es solo una puerta (todo corre en el navegador, la clave se guarda como SHA-256). La raíz del sitio ahora lleva a `entrar.html`, y las pantallas conectadas piden sesión si no la hay. Los enlaces viejos siguen funcionando: piden entrar y vuelven a la misma pantalla.
- **F8 · Cierre del mazo con poca información:** si se guardaron menos de 2 cartas (`closing_min_saves`), el cierre dice "Este mazo nos ayudó a conocerte un poco más." en vez de concluir algo.
- **F8 · Gusto de Camilo en la simulación:** es una hipótesis mía (cine de autor emotivo y melancólico). Hay que validarlo con el Camilo real usando la demo.
- **F9 · Estándar de caracteres:** premisa 44, título 24, "Una película de…" 40, sinopsis 110, razón al pie 96, pilares 18. Lo más largo se corta en una palabra con "…" (o en una frase completa). Están en `params.json` (`card_*_max`).
- **F9 · Dos cambios mínimos de plantilla en Descubrir:** el tamaño del título baja hasta 26 px para títulos largos, y la razón al pie puede ocupar 2 líneas (antes era 1 y se salía).
- **F9 · Pósters:** se encuadran hacia arriba (`50% 22%`) porque son verticales y el espacio es horizontal. El archivo de "Rocky" era el póster de "Rocky Balboa": se movió a esa película. El de "Interstellar" es una imagen vieja del prototipo (con logo de Netflix): conviene reemplazarlo por el póster oficial.
- **F9 · Pilares:** 90 etiquetas tenían más de 18 caracteres; un subagente las acortó conservando el sentido (por ejemplo, "locura en aislamiento" → "locura aislada"). Desde ahora el juez recibe el límite en el prompt.

## Para revisar cuando vuelvas
- **Responder las preguntas** de `docs/PREGUNTAS-RECOLECCION-DE-DATOS.md` (las urgentes están al inicio). Con eso se agregan los eventos del minijuego, el super like y la versión.
- **Pantallas con porcentajes.** Resumen, Perfil y Función siguen mostrando números de ejemplo ("100 %", "82/100", "41 % igual"): hay que pasarlos a palabras cuando se conecten.
- **Póster de Interstellar.** La imagen actual es la del prototipo viejo y trae el logo de Netflix: conviene cambiarla.
- **Pósters que faltan.** De todas las imágenes que mandaste por el chat, solo 5 llegaron como archivo (*Duna*, *Duna: Parte dos*, *Marty Supreme*, *Hereditary* y *Mortal Kombat II*): esas ya están. Las demás se pudieron ver, pero no guardar. Para agregarlas, súbelas a `apps/web/public/posters/` con el nombre de la lista `missing` de `packages/catalog/data/posters.json` (por ejemplo, `the-godfather-1972.jpg`) y corre `npm run catalog:posters && npm run catalog:build && npm run db:seeds`. Si las subes desde GitHub, se pueden procesar en una sesión.
- Subir el documento de Argon a `docs/historico/`.
- Resultados del simulador: `packages/engine/sim/RESULTADOS.md`.
- CSV de revisión del catálogo: `data/catalog/revision-20.csv`. Valores ancla del equipo en `data/catalog/anchors.json`.
