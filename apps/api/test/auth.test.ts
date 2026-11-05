import { describe, expect, it } from 'vitest';
import { devHeaderAuth, jwtHs256Auth, supabaseAuth } from '../src';
import { signJwt } from './jwt';

const SECRET = 'secreto-de-prueba-de-al-menos-32-caracteres';
const req = (token?: string, extra: Record<string, string> = {}) =>
  new Request('http://x/profile', { headers: { ...(token ? { authorization: `Bearer ${token}` } : {}), ...extra } });
const now = () => Math.floor(Date.now() / 1000);

describe('autenticación', () => {
  const auth = jwtHs256Auth(SECRET);
  it('JWT válido → el sub es la persona', async () => {
    expect(await auth(req(await signJwt({ sub: 'ana', exp: now() + 60 }, SECRET)))).toBe('ana');
  });
  it('rechaza firma equivocada, token vencido, sin sub o sin token', async () => {
    expect(await auth(req(await signJwt({ sub: 'ana', exp: now() + 60 }, 'otro-secreto')))).toBeNull();
    expect(await auth(req(await signJwt({ sub: 'ana', exp: now() - 10 }, SECRET)))).toBeNull();
    expect(await auth(req(await signJwt({ exp: now() + 60 }, SECRET)))).toBeNull();
    expect(await auth(req())).toBeNull();
    expect(await auth(req('basura'))).toBeNull();
  });
  it('audiencia opcional', async () => {
    const a = jwtHs256Auth(SECRET, { audience: 'authenticated' });
    expect(await a(req(await signJwt({ sub: 'ana', aud: 'authenticated' }, SECRET)))).toBe('ana');
    expect(await a(req(await signJwt({ sub: 'ana', aud: 'otra' }, SECRET)))).toBeNull();
  });
  it('Supabase Auth: pregunta a /auth/v1/user', async () => {
    const f = (async (url: string, init: RequestInit) => {
      expect(url).toBe('https://x.supabase.co/auth/v1/user');
      const ok = (init.headers as Record<string, string>).Authorization === 'Bearer bueno';
      return new Response(JSON.stringify(ok ? { id: 'uuid-ana' } : { msg: 'no' }), { status: ok ? 200 : 401 });
    }) as unknown as typeof fetch;
    const a = supabaseAuth('https://x.supabase.co', 'anon', f);
    expect(await a(req('bueno'))).toBe('uuid-ana');
    expect(await a(req('malo'))).toBeNull();
  });
  it('modo desarrollo: encabezado x-kinoo-user', async () => {
    expect(await devHeaderAuth()(req(undefined, { 'x-kinoo-user': 'leo' }))).toBe('leo');
  });
});
