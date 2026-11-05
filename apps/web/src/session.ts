// Mini inicio de sesión del modo demo (GitHub Pages, sin servidor).
// OJO: es una puerta para pruebas, no seguridad: todo corre en el navegador. La clave se guarda como SHA-256,
// no en texto plano, pero cualquiera con el código puede saltarla. La seguridad real la da Supabase Auth (o el
// proveedor de identidad) cuando el front use el back (ver docs/guias/integrar-un-front-nuevo.md).

export interface DemoAccount {
  username: string;
  name: string;
  /** UUID estable: el mismo id servirá cuando la cuenta exista en el back. */
  user_id: string;
  /** SHA-256 en hexadecimal de la clave. */
  password_sha256: string;
}

/** Cuentas de prueba. Para agregar una: calcula el SHA-256 de la clave y agrega una fila. */
export const DEMO_ACCOUNTS: DemoAccount[] = [
  {
    username: 'camilo',
    name: 'Camilo',
    user_id: '0c4a1100-0000-4000-8000-000000000001',
    password_sha256: '03ac674216f3e15c761ee1a5e255f067953623c8b388b4459e13f978d7c846f4',
  },
];

export interface Session {
  username: string;
  name: string;
  user_id: string;
  at: string;
}

const KEY = 'kinoo.session';

export function getSession(): Session | null {
  try {
    const s = JSON.parse(localStorage.getItem(KEY) ?? 'null') as Session | null;
    return s && DEMO_ACCOUNTS.some((a) => a.username === s.username && a.user_id === s.user_id) ? s : null;
  } catch {
    return null;
  }
}

export async function sha256Hex(text: string): Promise<string> {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

export async function login(username: string, password: string): Promise<Session | null> {
  const acc = DEMO_ACCOUNTS.find((a) => a.username === username.trim().toLowerCase());
  if (!acc || (await sha256Hex(password)) !== acc.password_sha256) return null;
  const s: Session = { username: acc.username, name: acc.name, user_id: acc.user_id, at: new Date().toISOString() };
  try {
    localStorage.setItem(KEY, JSON.stringify(s));
  } catch {
    /* sin almacenamiento: la sesión dura lo que dure la página */
  }
  return s;
}

export function logout(): void {
  try {
    localStorage.removeItem(KEY);
  } catch {
    /* nada que borrar */
  }
}

/** Ruta del inicio de sesión desde cualquier página del sitio (las pantallas viven en kinoo-flujo/). */
export function loginUrl(next: string = location.pathname + location.search): string {
  const base = location.pathname.includes('/kinoo-flujo/') ? '../' : './';
  return `${base}entrar.html?next=${encodeURIComponent(next)}`;
}
