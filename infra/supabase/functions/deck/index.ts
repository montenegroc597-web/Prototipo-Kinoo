// Supabase Edge Function: /functions/v1/deck/…  Todas las funciones comparten el mismo manejador (apps/api).
// Antes de desplegar: npm run supabase:build (empaqueta _shared/kinoo-api.js).
import { createSupabaseEdgeHandler } from '../_shared/kinoo-api.js';

Deno.serve(createSupabaseEdgeHandler());
