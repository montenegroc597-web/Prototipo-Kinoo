# Documentación de Kinoo

**Para qué sirve esto.** Es el índice. Cada documento empieza diciendo para qué sirve y termina con un ejemplo con números.

## Para entender

| Documento | Para qué |
|---|---|
| [ARQUITECTURA.md](ARQUITECTURA.md) | Front, back, paquetes y por dónde pasa una recomendación |
| [KINOO_ALGORITMO_v2.md](KINOO_ALGORITMO_v2.md) | La especificación del algoritmo (fuente de verdad) |
| [guias/algoritmo-paso-a-paso.md](guias/algoritmo-paso-a-paso.md) | De un evento a una recomendación, con números |
| [PROGRESS.md](PROGRESS.md) | Estado, bitácora y **decisiones tomadas sin Camilo** |
| [KINOO_PLAN_MAESTRO.md](KINOO_PLAN_MAESTRO.md) | Las fases del proyecto y sus comprobaciones |

## Para trabajar

| Documento | Para qué |
|---|---|
| [guias/integrar-un-front-nuevo.md](guias/integrar-un-front-nuevo.md) | Conectar un front nuevo al back: pantallas, llamadas, pósters |
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

Estado al 5 de noviembre de 2026:

- 69 películas (simulación de TMDB), 18 con póster.
- 116 pruebas unitarias y de integración, y 3 e2e, en verde.
- 5 de 5 pruebas de aprendizaje: tras 40 eventos, el mazo trae 6,4 veces más aciertos que uno al azar.
- La base de datos se prueba con dos proveedores: Supabase y PostgreSQL genérico.
