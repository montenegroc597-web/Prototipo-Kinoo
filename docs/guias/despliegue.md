# Despliegue

**Para qué sirve esto.** Lista los pasos manuales que quedan para publicar el modo demo y, cuando se quiera, conectar Supabase. Nada de esto se hizo solo: la sesión no cambia la configuración del repositorio ni tiene cuentas de servicio.

## 1. GitHub Pages (modo demo)

- `main` publica con `.github/workflows/deploy.yml`. Ahora construye `site/` (`npm ci`, `npm run build`, `npm run check:site`) en vez de copiar `public/`.
- La fuente de Pages sigue siendo **GitHub Actions**: no hay que cambiar nada en Settings → Pages.
- Las rutas no cambian: `https://montenegroc597-web.github.io/Prototipo-Kinoo/kinoo-flujo/…`. `check:site` falla si falta alguna de las 86.
- **Ojo:** al fusionar en `main`, el enlace del prototipo pasa a usar el motor en Descubrir y Ver. Si ese enlace se está usando en pruebas con participantes, fusiona cuando no haya una ronda en curso.

Para mirarlo en local antes de fusionar:

```bash
npm ci
```

```bash
npm run build && npm run serve
```

y abre `http://localhost:4173/Prototipo-Kinoo/`.

## 2. Supabase (producto)

**No uses el proyecto «Pruebas Kinoo»:** es el de la herramienta de usabilidad. Crea uno nuevo.

1. Crea el proyecto en supabase.com y anota la URL, la clave anónima (`anon`) y la de servicio (`service_role`). Guárdalas como variables de entorno o secretos, nunca en el repositorio (ver `.env.example`).
2. Aplica las migraciones en orden (`supabase/migrations/0001…0006`) desde el editor SQL o con el CLI:

```bash
supabase link --project-ref <ref>
```

```bash
supabase db push
```

3. Carga las semillas: `supabase/seed/001_config.sql` y `002_catalogo.sql`. Si cambiaste algo en `data/`, primero:

```bash
npm run seed
```

4. Empaqueta y despliega las funciones:

```bash
npm run build:functions
```

```bash
supabase functions deploy events && supabase functions deploy deck && supabase functions deploy watch && supabase functions deploy onboarding
```

5. (Opcional) Restringe el origen con el secreto `KINOO_ALLOWED_ORIGIN` (por ejemplo `https://montenegroc597-web.github.io`).
6. Activa un método de inicio de sesión en Supabase Auth (correo o enlace mágico). Las funciones exigen una sesión.

Las pantallas actuales usan el modo demo. Para que un front use Supabase, se crea el cliente con `supabaseAdapter({ url, anonKey, accessToken })` de `apps/web/src/adapter.ts`.

## 3. Catálogo de 300 películas

Necesita `TMDB_API_KEY` y acceso de red a `api.themoviedb.org` e `image.tmdb.org`. Pasos en `catalogo.md`.

## 4. Legal

- Revisar los términos comerciales de TMDB y JustWatch antes de lanzar.
- Agregar el logo de TMDB donde se muestren sus datos.
- Revisar con un abogado la política de datos (Ley 1581): las funciones de exportar y borrar ya existen (`kinoo_export_my_data`, `kinoo_delete_my_data`).

## Ejemplo con números

Una publicación normal tarda unos 2 minutos en la CI:

- `npm ci`: unos 40 s.
- `npm run build`: menos de 2 s (copia 86 archivos y empaqueta el motor en unos 75 KB).
- `check:site`: comprueba las 86 rutas.
- Subida a Pages: el resto.
