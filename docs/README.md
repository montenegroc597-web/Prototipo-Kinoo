# Documentación de Kinoo

**Para qué sirve esto.** Es el índice. Cada documento empieza diciendo para qué sirve y termina con un ejemplo con números.

## Para entender

| Documento | Para qué |
|---|---|
| [COMO-FUNCIONA-EL-ALGORITMO.md](COMO-FUNCIONA-EL-ALGORITMO.md) | **Cómo funciona el algoritmo, en sencillo**, y su punto de valor. Versión gráfica con laboratorio: [presentacion/como-funciona-kinoo.html](presentacion/como-funciona-kinoo.html) |
| [PREGUNTAS-RECOLECCION-DE-DATOS.md](PREGUNTAS-RECOLECCION-DE-DATOS.md) | **Preguntas para el equipo**: cómo recolectamos los datos desde cada función del front |
| [ARQUITECTURA.md](ARQUITECTURA.md) | Front, back, paquetes y por dónde pasa una recomendación |
| [KINOO_ALGORITMO_v2.md](KINOO_ALGORITMO_v2.md) | La especificación del algoritmo (fuente de verdad) |
| [SIMULACION-PERFILAMIENTO.md](SIMULACION-PERFILAMIENTO.md) | **Cómo se perfilan los usuarios**: Camilo en la app y seis tipos de usuario |
| [guias/algoritmo-paso-a-paso.md](guias/algoritmo-paso-a-paso.md) | De un evento a una recomendación, con números |
| [PROGRESS.md](PROGRESS.md) | Estado, bitácora y **decisiones tomadas sin Camilo** |
| [auditoria/INFORME.md](auditoria/INFORME.md) | **Informe final de la auditoría (F11)**: qué es real y qué es maqueta, pruebas, hallazgos y decisiones abiertas |
| [auditoria/ux-ui.md](auditoria/ux-ui.md) | Auditoría UX-UI pantalla por pantalla, con lista priorizada |
| [auditoria/especificacion-ver-b7c.md](auditoria/especificacion-ver-b7c.md) | Especificación de la pantalla Ver nueva (B7c): estados, datos, accesibilidad |
| [auditoria/BRIEF-EQUIPO.md](auditoria/BRIEF-EQUIPO.md) | Encargo de los cuatro roles de F11 y contrato del puente |
| [KINOO_PLAN_MAESTRO.md](KINOO_PLAN_MAESTRO.md) | Las fases del proyecto y sus comprobaciones |

## Para trabajar

| Documento | Para qué |
|---|---|
| [guias/integrar-un-front-nuevo.md](guias/integrar-un-front-nuevo.md) | Conectar un front nuevo al back: pantallas, llamadas, pósters |
| [guias/actualizar-el-front-con-ia.md](guias/actualizar-el-front-con-ia.md) | **Cambiar o reemplazar una pantalla con IA** sin romper el puente ni las reglas (prompt listo) |
| [guias/limites-de-texto.md](guias/limites-de-texto.md) | Cuántos caracteres caben en cada texto de cada pantalla |
| [guias/contrato-api.md](guias/contrato-api.md) | Cada endpoint con ejemplos |
| [guias/para-camilo-ajustar-el-algoritmo.md](guias/para-camilo-ajustar-el-algoritmo.md) | Cambiar pesos, moods, mazos y frases sin programar |
| [guias/catalogo.md](guias/catalogo.md) | TMDB real o simulado, juez, pósters, agregar películas |
| [guias/base-de-datos.md](guias/base-de-datos.md) | Tablas, proveedores (Supabase u otra nube) y seguridad |
| [guias/despliegue.md](guias/despliegue.md) | Publicar el front; levantar la base y la API en Supabase, otra nube o Docker |
| [guias/pruebas.md](guias/pruebas.md) | Qué se prueba, dónde y cómo correrlo |
| [../AGENTS.md](../AGENTS.md) | Mapa y reglas para agentes de IA |

## Decisiones de arquitectura

| ADR | Tema |
|---|---|
| [0001](adr/0001-estructura.md) | En qué repositorio se construye |
| [0002](adr/0002-monorepo.md) | Monorepo con workspaces (actualizada por la 0004) |
| [0003](adr/0003-api-y-modo-demo.md) | Un solo servicio para la API y el modo demo |
| [0004](adr/0004-front-back-y-nube.md) | Front y back separados, base de datos portátil y simulación de TMDB |

## Ejemplo con números

Estado al 17 de noviembre de 2026 (F11):

- 69 películas (simulación de TMDB), 18 con póster.
- 148 pruebas unitarias y de integración, y 14 e2e, en verde (las e2e revisan los textos de las 69 películas en el navegador y recorren Ver, Perfil, Resumen y Ticket con el puente real).
- 14 pantallas con ficha en `apps/web/front.manifest.json`; 0 porcentajes visibles.
- 5 de 5 pruebas de aprendizaje: tras 40 eventos, el mazo trae 6,4 veces más aciertos que uno al azar; 6 de 6 arquetipos en la simulación de perfiles.
- La base de datos se prueba con dos proveedores: Supabase y PostgreSQL genérico.
