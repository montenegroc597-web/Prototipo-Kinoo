// Autenticación: de una petición sale el id de la persona (UUID) o null. El back no guarda contraseñas:
// confía en el proveedor de identidad (Supabase Auth u otro que firme JWT).
export type Authenticator = (req: Request) => Promise<string | null>;

const b64url = (s: string) =>
  Uint8Array.from(
    atob(
      s
        .replace(/-/g, '+')
        .replace(/_/g, '/')
        .padEnd(Math.ceil(s.length / 4) * 4, '='),
    ),
    (c) => c.charCodeAt(0),
  );
const bearer = (req: Request) => req.headers.get('authorization')?.match(/^Bearer\s+(.+)$/i)?.[1] ?? null;

/**
 * JWT firmados con HS256 (el secreto JWT de Supabase o el de cualquier proveedor). Sin dependencias: WebCrypto.
 * Comprueba firma, expiración y que `sub` exista.
 */
export function jwtHs256Auth(secret: string, opts: { audience?: string } = {}): Authenticator {
  let key: Promise<CryptoKey> | null = null;
  return async (req) => {
    const token = bearer(req);
    if (!token) return null;
    const [h, p, s] = token.split('.');
    if (!h || !p || !s) return null;
    try {
      const header = JSON.parse(new TextDecoder().decode(b64url(h)));
      if (header.alg !== 'HS256') return null;
      key ??= crypto.subtle.importKey('raw', new TextEncoder().encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['verify']);
      const ok = await crypto.subtle.verify('HMAC', await key, b64url(s), new TextEncoder().encode(`${h}.${p}`));
      if (!ok) return null;
      const claims = JSON.parse(new TextDecoder().decode(b64url(p)));
      if (typeof claims.exp === 'number' && claims.exp * 1000 < Date.now()) return null;
      if (opts.audience && claims.aud !== opts.audience) return null;
      return typeof claims.sub === 'string' ? claims.sub : null;
    } catch {
      return null;
    }
  };
}

/** Supabase Auth: pregunta al servidor de Auth quién es el dueño del token (sirve con cualquier algoritmo de firma). */
export function supabaseAuth(url: string, anonKey: string, f: typeof fetch = fetch): Authenticator {
  return async (req) => {
    const token = bearer(req);
    if (!token) return null;
    const r = await f(`${url}/auth/v1/user`, { headers: { apikey: anonKey, Authorization: `Bearer ${token}` } });
    if (!r.ok) return null;
    const u = await r.json();
    return typeof u?.id === 'string' ? u.id : null;
  };
}

/** Solo desarrollo local: la persona viene en el encabezado x-kinoo-user. Nunca activar en producción. */
export function devHeaderAuth(): Authenticator {
  return async (req) => req.headers.get('x-kinoo-user');
}
