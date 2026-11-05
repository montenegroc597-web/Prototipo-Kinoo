# Despliegue

**Para qué sirve esto.** Dice cómo publicar el front, y cómo levantar la base de datos y la API en Supabase o en otra nube cuando llegue el momento. Hoy solo está activo el front en GitHub Pages; lo demás queda preparado y probado.

## 1. Front en GitHub Pages (activo)

- `main` publica con `.github/workflows/deploy.yml`: `npm ci`, `npm run build` (arma `apps/web/dist`), comprobación de las 86 rutas y publicación.
- La fuente de Pages es **GitHub Actions**. Las rutas no cambian: `https://montenegroc597-web.github.io/Prototipo-Kinoo/kinoo-flujo/…`.
- Para mirarlo en local:

```bash
npm ci
```

```bash
npm run dev:web
```

Abre `http://localhost:4173/Prototipo-Kinoo/`.

## 2. Base de datos: elige dónde

Las migraciones son las mismas en todas partes. Solo cambia el **proveedor** (quién es la persona actual en las reglas de seguridad):

| Opción | Proveedor | Cuándo |
|---|---|---|
| **Supabase** | `supabase` | Quieres cuentas (Supabase Auth), API REST y funciones sin mantener servidores |
| **PostgreSQL genérico** (Neon, AWS RDS, Google Cloud SQL, Azure, Railway, Render, Docker) | `postgres` | Ya tienes nube o quieres control total. La API corre en Node |

**No uses el proyecto «Pruebas Kinoo»:** es el de la herramienta de usabilidad. Crea uno nuevo.

### 2a. Supabase

1. Crea el proyecto y anota la URL, la clave `anon` y la `service_role`. Guárdalas como variables o secretos (ver `.env.example`), nunca en el repositorio.
2. Genera la carpeta del CLI (migraciones con el proveedor de Supabase, `seed.sql` y la API empaquetada):

```bash
npm run supabase:build
```

3. Desde `infra/supabase/`:

```bash
supabase link --project-ref <ref>
```

```bash
supabase db push --include-seed
```

```bash
supabase functions deploy events && supabase functions deploy deck && supabase functions deploy watch && supabase functions deploy onboarding
```

4. Secretos de las funciones (opcionales): `KINOO_ALLOWED_ORIGINS` y `KINOO_ASSET_BASE_URL`. Por defecto, la URL de GitHub Pages.
5. Activa un método de inicio de sesión en Supabase Auth.

Alternativa sin CLI: `DATABASE_URL=<conexión directa> npm run db:migrate -- --supabase`.

### 2b. PostgreSQL en cualquier otra nube

1. Crea la base (PostgreSQL 15 o más, con la extensión `vector`).
2. Aplica proveedor, migraciones y semillas:

```bash
DATABASE_URL=postgres://… npm run db:migrate
```

3. Despliega la API (`apps/api`) donde corra Node 22 o un contenedor. La imagen está en `infra/docker/api.Dockerfile`. Variables:
   - `DATABASE_URL`: la base.
   - `KINOO_JWT_SECRET`: el secreto con que tu proveedor de identidad firma los JWT (HS256). Puede ser el de Supabase Auth, Auth0, Clerk u otro.
   - `KINOO_ALLOWED_ORIGINS`: los orígenes del front, separados por coma.
   - `KINOO_ASSET_BASE_URL`: dónde están los pósters (por defecto, la URL de GitHub Pages).
   - `PORT`: 8787 por defecto.

### 2c. Todo en local con Docker

```bash
docker compose -f infra/docker/compose.yml up -d db
```

```bash
DATABASE_URL=postgres://kinoo:kinoo@localhost:5432/kinoo npm run db:migrate
```

```bash
docker compose -f infra/docker/compose.yml up api
```

La API queda en `http://localhost:8787` con autenticación de desarrollo: el encabezado `x-kinoo-user: <uuid>` hace de sesión. Solo en local.

## 3. Catálogo real

Necesita `TMDB_API_KEY` y red a `api.themoviedb.org` e `image.tmdb.org`. Pasos en `catalogo.md`.

## 4. Legal

- Términos comerciales de TMDB y JustWatch. Logo de TMDB donde se muestren sus datos.
- Derechos de los pósters publicados en el repositorio (son material promocional de terceros).
- Política de datos (Ley 1581). Las funciones `kinoo_export_my_data` y `kinoo_delete_my_data` ya existen.

## Ejemplo con números

Una publicación del front tarda unos 2 minutos en GitHub:

- `npm ci`: unos 40 s.
- `npm run build`: menos de 3 s (copia el prototipo y empaqueta el motor con 69 películas en unos 140 KB).
- Comprobación de rutas: 86 de 86.
- Subida a Pages: el resto.
