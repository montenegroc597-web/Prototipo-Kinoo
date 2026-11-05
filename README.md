# Prototipo Kinoo

Prototipo navegable de Kinoo (flujos **Descubrir** y **Ver**) y, desde la v2, el back: base de datos, motor del algoritmo, catálogo, API y modo demo.

**Demo:** https://montenegroc597-web.github.io/Prototipo-Kinoo/

📖 **Documentación:** [`docs/README.md`](docs/README.md) · Estado y decisiones: [`docs/PROGRESS.md`](docs/PROGRESS.md) · Ajustar el algoritmo sin programar: [`docs/guias/para-camilo-ajustar-el-algoritmo.md`](docs/guias/para-camilo-ajustar-el-algoritmo.md)

## Estructura

```
apps/web/                  # el prototipo (antes public/): lo que se publica
├── index.html             # redirige a la primera pantalla
├── kinoo-flujo/           # pantallas .dc.html y _blob/ (no renombrar)
├── _prototipos/           # runtime de las pantallas
└── src/                   # modo demo (motor en el navegador) y adaptador de datos
packages/                  # shared (tipos), engine (algoritmo), api (endpoints)
supabase/                  # migraciones, semillas y Edge Functions
data/                      # configuración editable y catálogo piloto
docs/                      # documentación
```

Las pantallas referencian `../_prototipos/dc-runtime.js`, `../_kinoo/kinoo-demo.js` y `_blob/…` con rutas relativas: conservar esta disposición de carpetas.

## Ejecutar en local

```
npm ci
npm run build && npm run serve
```
y abrir `http://localhost:4173/Prototipo-Kinoo/`.

## Despliegue

Cada push a `main` construye `site/` y lo publica en GitHub Pages con `.github/workflows/deploy.yml` (fuente de Pages: GitHub Actions). Detalle en [`docs/guias/despliegue.md`](docs/guias/despliegue.md).
