// POST /functions/v1/events  · cuerpo: { "events": [EventInput, ...] }
// @ts-nocheck
import { ApiError } from '../_shared/kinoo-core.js';
import { body, serve } from '../_shared/handler.ts';

serve(async (svc, req) => {
  if (req.method !== 'POST') throw new ApiError(405, 'Usa POST');
  const b = await body(req);
  return svc.postEvents(b.events);
});
