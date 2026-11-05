# Kinoo

App colombiana para decidir qué película ver. No reproduce películas: ayuda a descubrirlas (**Descubrir**, mazos de cartas), propone una para esta noche (**Ver**) y te lleva a la plataforma donde ya la tienes.

**Demo:** https://montenegroc597-web.github.io/Prototipo-Kinoo/

| | |
|---|---|
| 📖 Documentación | [`docs/README.md`](docs/README.md) |
| 🗺️ Arquitectura | [`docs/ARQUITECTURA.md`](docs/ARQUITECTURA.md) |
| 🔌 Conectar un front nuevo | [`docs/guias/integrar-un-front-nuevo.md`](docs/guias/integrar-un-front-nuevo.md) |
| 🎛️ Ajustar el algoritmo sin programar | [`docs/guias/para-camilo-ajustar-el-algoritmo.md`](docs/guias/para-camilo-ajustar-el-algoritmo.md) |
| 🤖 Guía para agentes de IA | [`AGENTS.md`](AGENTS.md) |
| ✅ Estado y decisiones | [`docs/PROGRESS.md`](docs/PROGRESS.md) |

## Estructura

```
apps/
  web/          FRONT · prototipo (public/), modo demo y adaptador (src/), e2e/
  api/          BACK  · API HTTP portátil: Node, Supabase Edge o cualquier nube
packages/
  shared/       tipos y contratos
  config/       configuración editable del algoritmo (data/*.json)
  engine/       el algoritmo de recomendación v2 (puro) y su simulador
  core/         casos de uso y puertos
  db/           migraciones portátiles (Supabase o PostgreSQL), semillas y repositorios
  catalog/      catálogo: TMDB real o simulado, juez sintético, pósters
infra/          Docker y proyecto de Supabase
docs/           especificación, arquitectura, guías y decisiones
```

## Empezar

Requiere Node 22.

```bash
npm ci
```

```bash
npm run dev:web
```

Abre `http://localhost:4173/Prototipo-Kinoo/`. Para correr todas las verificaciones de la CI (menos e2e):

```bash
npm run check
```

## Despliegue

Cada push a `main` publica el front en GitHub Pages (`.github/workflows/deploy.yml`). La base de datos y la API están listas para Supabase u otra nube, pero todavía no se despliegan: ver [`docs/guias/despliegue.md`](docs/guias/despliegue.md).
