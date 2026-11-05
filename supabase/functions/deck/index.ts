// GET  /functions/v1/deck/current
// POST /functions/v1/deck/open  · cuerpo: { "vibe"?: string, "size"?: 5|10|20, "only_my_platforms"?: boolean }
// @ts-nocheck
import { ApiError } from '../_shared/kinoo-core.js';
import { body, serve } from '../_shared/handler.ts';

serve(async (svc, req, url) => {
  if (req.method === 'GET' && url.pathname.endsWith('/current')) return { deck: svc.currentDeck() };
  if (req.method === 'POST' && url.pathname.endsWith('/open')) return { deck: svc.openDeck(await body(req)) };
  throw new ApiError(404, 'Ruta desconocida: usa GET /deck/current o POST /deck/open');
});
