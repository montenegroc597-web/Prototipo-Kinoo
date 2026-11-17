**Para qué sirve esto.** Es el paso a paso para que una persona o un modelo de IA cambie o reemplace una pantalla del prototipo de Kinoo sin romper el puente con el back, las rutas publicadas ni las reglas del producto (nada de porcentajes de afinidad). Trae un prompt listo para copiar.

# Actualizar el front con IA

## La idea en una frase

Cada pantalla tiene una ficha en [`apps/web/front.manifest.json`](../../apps/web/front.manifest.json): para qué sirve, qué métodos del puente `window.KinooDemo` usa, qué textos tienen límite y a qué pantalla lleva. El script `npm run check:front` compara la ficha con el archivo real y avisa si algo no cuadra. Si la ficha y la pantalla dicen lo mismo y el script pasa, el cambio está bien encaminado.

## Qué leer, en este orden

1. `apps/web/front.manifest.json`: la ficha de la pantalla que vas a tocar (y las reglas de arriba).
2. `apps/web/src/demo.ts`: los métodos del puente y lo que devuelve cada uno (los tipos están en `packages/shared/src/api.ts`). **Solo se lee: es del back.**
3. `docs/guias/limites-de-texto.md`: cuántos caracteres caben en cada texto.
4. La pantalla misma, en `apps/web/public/kinoo-flujo/<Archivo>.dc.html`. Para Ver, además, `docs/auditoria/especificacion-ver-b7c.md`.

## Cómo está hecha una pantalla `.dc.html`

- En el `<head>`: `../_prototipos/dc-runtime.js` (el motor de plantillas), `../_kinoo/kinoo-shell.css` (el marco de celular, el fondo y el foco visible) y, si está conectada, `../_kinoo/kinoo-demo.js` (el puente; sin sesión manda a `entrar.html`).
- Dentro de `<x-dc>`: el HTML con estilos en línea y plantillas: `{{valor}}`, `<sc-if value="{{cond}}">` y `<sc-for list="{{lista}}" as="x">`.
- Al final, `<script type="text/x-dc">` con `class Component extends DCLogic { renderVals() { … } }`. `renderVals()` devuelve los valores de la plantilla; `this.state` y `this.setState()` funcionan como en React.
- El puente se usa así: `const KD = window.KinooDemo; if (KD) { … KD.insight() … }`. **Siempre con respaldo:** si `KD` no existe, la pantalla muestra textos neutros o de ejemplo marcados como ejemplo, nunca datos inventados como si fueran de la persona.

## Qué no tocar

| No toques | Por qué | Qué hacer en su lugar |
|---|---|---|
| `packages/**`, `apps/web/src/**` | Son del back (algoritmo y puente) | Si falta un dato, pídelo al back y anótalo |
| El nombre o la carpeta de una pantalla | Hay 86 rutas publicadas | Cambia el contenido, no el archivo |
| `apps/web/public/kinoo-flujo/_blob/*` existentes | Los usan otras pantallas y rutas publicadas | Agrega archivos nuevos si necesitas |
| Cálculos del algoritmo en el front | El front muestra lo que da el back, en su orden | Usa el método del puente |

## Reglas del contenido

- Nunca porcentajes, "/100", "match" ni "% igual". Los niveles van en palabras: `alto` = "mucho", `medio` = "bastante", `bajo` = "un poco", con una barra de 3 segmentos (no una barra continua: eso es un porcentaje dibujado).
- Conteos de cosas sí (por ejemplo, "6 quieres ver", "3 en cartelera"): son conteos, no afinidad.
- Textos del back: se muestran tal cual llegan (ya vienen recortados). Textos nuevos del front: respeta la tabla de límites; un aviso flotante cabe en 60 caracteres.
- Botones de al menos 44 × 44 px, textos de al menos 11 px, y los botones que no llevan a ningún lado se quitan o se atenúan.

## Paso a paso

1. **Lee la ficha** de la pantalla en el manifiesto.
2. **Haz el cambio** en el `.dc.html`. Si el cambio usa otro método del puente, agrégalo también a `"bridge"` de la ficha. Si cambia a dónde lleva, actualiza `"next"`. Si aparece un texto con límite, agrégalo a `"texts"` con su clave de `params.json`.
3. **Pantalla nueva:** créala en `apps/web/public/kinoo-flujo/` y agrega su ficha al manifiesto (el script falla si una pantalla no tiene ficha).
4. **Revisa sin navegador:**
   ```bash
   npm run check:front
   ```
   Te dice, por ejemplo: `ver: usa watchQueue() pero el manifiesto no lo lista en "bridge"` o `resumen: texto visible con un porcentaje`.
5. **Mírala en el navegador** a 402 × 874:
   ```bash
   npm run build -w @kinoo/web
   node apps/web/scripts/serve.mjs 4173
   # http://localhost:4173/Prototipo-Kinoo/entrar.html  (camilo / 1234)
   ```
   En la consola: `KinooDemo.reset()` para una sesión vacía; `KinooDemo.events()` para ver qué acciones se guardaron.
6. **Corre todo:**
   ```bash
   npm run check                                                   # lint, tipos, check:front, pruebas, build y rutas
   PW_CHROMIUM_PATH=/opt/pw-browsers/chromium npm run test:e2e     # navegador
   ```
   Si cambiaste textos, selectores o el flujo de una pantalla, adapta la prueba de `apps/web/e2e/` que la recorre (las pantallas de Ver usan atributos `data-k`; están en `"selectors"` de su ficha).

## Prompt de ejemplo (para copiar)

```text
Eres el ingeniero de front de Kinoo. Repositorio: Prototipo-Kinoo.
Tarea: <describe el cambio; por ejemplo "en Perfil, muestra los moods antes que los rasgos y agrega un enlace a Ver">.

Antes de cambiar nada, lee en este orden:
1. apps/web/front.manifest.json (la ficha de la pantalla y las reglas).
2. apps/web/src/demo.ts y packages/shared/src/api.ts (solo leer: qué devuelve cada método del puente).
3. docs/guias/limites-de-texto.md.
4. La pantalla: apps/web/public/kinoo-flujo/<archivo>.dc.html.

Reglas:
- No toques packages/** ni apps/web/src/**. No renombres archivos.
- Nada de porcentajes, "/100" ni "match". Niveles en palabras (mucho, bastante, un poco) con barra de 3 segmentos.
- Usa solo métodos que existan en el puente; si falta un dato, no lo inventes: escríbelo en tu reporte para el back.
- Si el puente no carga, la pantalla muestra textos neutros.
- Mantén la ficha del manifiesto al día ("bridge", "next", "texts").

Al terminar corre: npm run check:front, npm run check y
PW_CHROMIUM_PATH=/opt/pw-browsers/chromium npm run test:e2e.
Responde con: archivos cambiados, resultado de cada comando y qué falta del back.
```

## Ejemplo con números

Se quiere que Resumen diga cuántas películas hay en la cartelera de Ver.

- La ficha `resumen` decía `"bridge": ["lastClosing", "events", "closingLine", "insight"]`. El cambio agrega `KD.billboard('todas')` en la pantalla.
- Sin tocar el manifiesto, `npm run check:front` responde con **1 problema**: `resumen: usa billboard() pero el manifiesto no lo lista en "bridge"`.
- Se agrega `"billboard"` a la ficha (ahora son 5 métodos) y el script responde `OK: 14 pantallas del manifiesto revisadas (puente: 27 métodos en apps/web/src/demo.ts).`
- Con 7 películas guardadas y 1 calificada, la cartelera "Todas" trae 6: el enlace dice "Ir a Ver · 6 en tu cartelera" (un conteo, permitido). Si alguien hubiera escrito "Ir a Ver · 93 % para ti", el mismo script lo habría frenado con `texto visible con un porcentaje`.
