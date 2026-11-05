// Entrada para Supabase Edge Functions (Deno). Se empaqueta en infra/supabase/functions/_shared/kinoo-api.js.
// Usa la API REST de Supabase con el JWT de la persona: RLS aplica siempre.
import { SupabaseRestRepository } from '@kinoo/db';
import { supabaseAuth } from './auth';
import { createKinooHandler } from './handler';

declare const Deno: { env: { get(k: string): string | undefined } };

export function createSupabaseEdgeHandler() {
  const url = Deno.env.get('SUPABASE_URL')!;
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
  const origins = Deno.env.get('KINOO_ALLOWED_ORIGINS');
  return createKinooHandler({
    auth: supabaseAuth(url, anonKey),
    // El catálogo se lee con la clave anónima (es público) y se cachea; los datos de la persona, con su JWT.
    repository: new SupabaseRestRepository({ url, anonKey }),
    userRepository: (req) => new SupabaseRestRepository({ url, anonKey, accessToken: req.headers.get('authorization')?.replace(/^Bearer\s+/i, '') }),
    assetBaseUrl: Deno.env.get('KINOO_ASSET_BASE_URL') ?? 'https://montenegroc597-web.github.io/Prototipo-Kinoo/',
    allowedOrigins: origins ? origins.split(',') : '*',
  });
}
