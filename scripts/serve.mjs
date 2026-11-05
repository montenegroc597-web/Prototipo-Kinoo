// Servidor estático mínimo para site/ (pruebas e2e y revisión local). Uso: node scripts/serve.mjs [puerto]
// Sirve site/ bajo /Prototipo-Kinoo/ para imitar GitHub Pages.
import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../site');
const port = Number(process.argv[2] || process.env.PORT || 4173);
const base = '/Prototipo-Kinoo';
const types = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.webp': 'image/webp', '.css': 'text/css' };

createServer(async (req, res) => {
  let p = decodeURIComponent((req.url || '/').split('?')[0]);
  if (p === '/' ) { res.writeHead(302, { location: base + '/' }); return res.end(); }
  if (!p.startsWith(base)) { res.writeHead(404); return res.end(); }
  p = p.slice(base.length) || '/';
  let file = path.join(root, p);
  if (!file.startsWith(root)) { res.writeHead(403); return res.end(); }
  try {
    if ((await stat(file)).isDirectory()) file = path.join(file, 'index.html');
    const body = await readFile(file);
    res.writeHead(200, { 'content-type': types[path.extname(file)] || 'application/octet-stream' });
    res.end(body);
  } catch {
    res.writeHead(404); res.end('no encontrado');
  }
}).listen(port, () => console.log(`site/ en http://localhost:${port}${base}/`));
