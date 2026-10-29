# Prototipo Kinoo

Prototipo navegable de Kinoo (HTML estático, sin build). Flujo **Descubrir** (mazo, minijuego, ticket, perfil) y flujo **Ver** (feed, función, calificar).

**Demo:** https://montenegroc597-web.github.io/Prototipo-Kinoo/

## Estructura

```
public/                    # raíz publicada (es lo que se despliega)
├── index.html             # redirige a la primera pantalla
├── kinoo-flujo/
│   ├── Flujo1…5_*.dc.html     # flujo Descubrir
│   ├── FlujoV1…6_*.dc.html    # flujo Ver
│   ├── prototipo.json         # metadatos (tamaño 402×844, pantalla inicial)
│   └── _blob/                 # pósters, imágenes e íconos (nombres con hash: no renombrar)
└── _prototipos/
    ├── dc-runtime.js          # runtime de las pantallas .dc.html
    └── embed.js
.github/workflows/deploy.yml  # despliegue a GitHub Pages
```

Las pantallas referencian `../_prototipos/dc-runtime.js` y `_blob/…` con rutas relativas: conservar esta disposición de carpetas.

## Ejecutar en local

```
npx serve public
```
y abrir `/kinoo-flujo/Flujo1_Descubrir.dc.html` (no funciona con `file://`).

## Despliegue

Cada push a `main` publica `public/` en GitHub Pages con `.github/workflows/deploy.yml`.
Activar una vez en el repo: **Settings → Pages → Source: GitHub Actions**.