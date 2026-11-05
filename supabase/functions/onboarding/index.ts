// POST /functions/v1/onboarding · cuerpo: { "step": "pairs" } | { "step": "platforms", ... } | { "step": "choices", ... }
// @ts-nocheck
import { ApiError } from '../_shared/kinoo-core.js';
import { body, serve } from '../_shared/handler.ts';

serve(async (svc, req) => {
  if (req.method !== 'POST') throw new ApiError(405, 'Usa POST');
  return svc.onboarding(await body(req));
});
