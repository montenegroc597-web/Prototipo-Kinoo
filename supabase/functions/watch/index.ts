// GET /functions/v1/watch/proposal?max_runtime_min=100&vibe=llorar_bonito&company=pareja
// @ts-nocheck
import { ApiError } from '../_shared/kinoo-core.js';
import { serve } from '../_shared/handler.ts';

serve((svc, req, url) => {
  if (req.method !== 'GET' || !url.pathname.endsWith('/proposal')) throw new ApiError(404, 'Usa GET /watch/proposal');
  const q = url.searchParams;
  return svc.watchProposal({
    ...(q.get('max_runtime_min') ? { max_runtime_min: Number(q.get('max_runtime_min')) } : {}),
    ...(q.get('vibe') ? { vibe: q.get('vibe') } : {}),
    ...(q.get('company') ? { company: q.get('company') } : {}),
  });
});
