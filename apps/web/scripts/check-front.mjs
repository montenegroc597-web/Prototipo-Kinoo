// Revisa el front sin navegador, a partir de apps/web/front.manifest.json. Uso: node scripts/check-front.mjs (npm run check:front).
// Comprueba que cada pantalla existe, carga el puente y el marco si está conectada, solo llama métodos que existen en
// src/demo.ts (y justo los que dice el manifiesto), no muestra porcentajes ni "match", sus enlaces llevan a archivos que
// existen, su script se puede leer y los límites de texto apuntan a claves reales de params.json.
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const web = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const root = path.resolve(web, '../..');
const manifest = JSON.parse(readFileSync(path.join(web, 'front.manifest.json'), 'utf8'));
const pub = path.join(root, manifest.base);
const params = JSON.parse(readFileSync(path.join(root, 'packages/config/data/params.json'), 'utf8'));
const errors = [];
const fail = (screen, msg) => errors.push(`${screen}: ${msg}`);

// Métodos del puente: las claves de primer nivel del objeto `const api = { … }` en demo.ts.
const demo = readFileSync(path.join(root, manifest.bridge.source), 'utf8');
const apiStart = demo.indexOf('const api = {');
const apiEnd = demo.indexOf('\n};', apiStart);
if (apiStart < 0 || apiEnd < 0) {
  console.error(`No encontré "const api = {" en ${manifest.bridge.source}`);
  process.exit(1);
}
const bridgeMethods = new Set([...demo.slice(apiStart, apiEnd).matchAll(/^ {2}(?:async\s+)?([A-Za-z_]\w*)\s*[(:]/gm)].map((m) => m[1]));
const built = new Set(manifest.bridge.built_files);

const PROHIBITED_VISIBLE = [
  [/%\s*contigo/i, '"% contigo"'],
  [/%\s*igual/i, '"% igual"'],
  [/%\s*también/i, '"% también"'],
  [/\/\s*100\b/, '"/100"'],
  [/\bmatch\b/i, '"match"'],
  [/\d\s*%/, 'un porcentaje'],
];
const PROHIBITED_SCRIPT_STRINGS = [
  [/%\s*(contigo|igual|también|dijo)/i, 'un porcentaje de afinidad'],
  [/\/\s*100\b/, '"/100"'],
  [/\b(tu|el|de|un|mi) match\b/i, '"match"'],
];

const listed = new Set(manifest.screens.map((s) => s.file));
for (const f of readdirSync(path.join(pub, 'kinoo-flujo')).filter((f) => f.endsWith('.dc.html'))) {
  if (!listed.has(`kinoo-flujo/${f}`)) fail(f, 'no está en front.manifest.json (agrega su entrada)');
}

for (const s of manifest.screens) {
  const id = s.id;
  const file = path.join(pub, s.file);
  if (!existsSync(file)) {
    fail(id, `no existe ${manifest.base}/${s.file}`);
    continue;
  }
  if (s.route !== s.file) fail(id, `route (${s.route}) y file (${s.file}) deben ser iguales: la ruta publicada no se renombra`);
  const html = readFileSync(file, 'utf8');
  const dir = path.dirname(file);
  const isDc = s.file.endsWith('.dc.html');

  // 1. Puente y marco.
  if (isDc && !html.includes(`href="${manifest.bridge.shell_css}"`)) fail(id, `no carga ${manifest.bridge.shell_css}`);
  const loadsBridge = html.includes(`src="${manifest.bridge.script}"`);
  if (s.connected && !loadsBridge) fail(id, `está conectada pero no carga ${manifest.bridge.script}`);

  // 2. Métodos del puente: existen y coinciden con el manifiesto.
  const scripts = [...html.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/gi)].map((m) => m[1]).join('\n');
  const used = new Set([...scripts.matchAll(/\b(?:KinooDemo|KD|K)\s*\.\s*([A-Za-z_]\w*)\s*\(/g)].map((m) => m[1]));
  for (const m of used) if (!bridgeMethods.has(m)) fail(id, `llama KinooDemo.${m}(), que no existe en ${manifest.bridge.source}`);
  const declared = new Set(s.bridge || []);
  for (const m of used) if (!declared.has(m)) fail(id, `usa ${m}() pero el manifiesto no lo lista en "bridge"`);
  for (const m of declared) if (!used.has(m)) fail(id, `el manifiesto dice que usa ${m}() pero la pantalla no lo llama`);
  if (used.size && !loadsBridge) fail(id, `llama al puente pero no carga ${manifest.bridge.script}`);

  // 3. El script de la pantalla se puede leer (errores de sintaxis).
  for (const m of html.matchAll(/<script type="text\/x-dc"[^>]*>([\s\S]*?)<\/script>/g)) {
    try {
      new Function('DCLogic', `${m[1]}\nreturn Component;`);
    } catch (e) {
      fail(id, `el script de la pantalla tiene un error de sintaxis: ${e.message}`);
    }
  }

  // 4. Nada de porcentajes ni "match" en el texto visible (incluye aria-label, alt y title).
  const noCode = html
    .replace(/<script\b[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style\b[\s\S]*?<\/style>/gi, ' ')
    .replace(/<!--[\s\S]*?-->/g, ' ');
  const attrs = [...noCode.matchAll(/\b(?:aria-label|alt|title)="([^"]*)"/g)].map((m) => m[1]);
  const visible = `${noCode.replace(/<[^>]+>/g, ' ')} ${attrs.join(' ')}`.replace(/\{\{[^}]*\}\}/g, ' ').replace(/&nbsp;/g, ' ');
  for (const [re, what] of PROHIBITED_VISIBLE) {
    const m = visible.match(re);
    if (m) fail(id, `texto visible con ${what}: "…${visible.slice(Math.max(0, m.index - 30), m.index + 30).replace(/\s+/g, ' ')}…"`);
  }
  const literals = [...scripts.matchAll(/'(?:[^'\\\n]|\\.)*'|"(?:[^"\\\n]|\\.)*"|`(?:[^`\\]|\\.)*`/g)].map((m) => m[0]);
  for (const [re, what] of PROHIBITED_SCRIPT_STRINGS) {
    const lit = literals.find((l) => re.test(l));
    if (lit) fail(id, `el script tiene ${what} en un texto: ${lit.slice(0, 80)}`);
  }
  if (/\bmatch\s*:\s*\d/.test(scripts)) fail(id, 'los datos de ejemplo traen "match: <número>"');

  // 5. Enlaces y archivos referenciados.
  for (const m of html.matchAll(/\b(href|src)="([^"]+)"/g)) {
    const ref = m[2];
    if (/^(https?:|mailto:|#|data:|javascript:)/.test(ref) || ref.includes('{{')) continue;
    const clean = ref.split(/[?#]/)[0];
    const target = path.resolve(dir, clean);
    const rel = path.relative(pub, target).split(path.sep).join('/');
    if (built.has(rel)) continue;
    if (!existsSync(target)) fail(id, `${m[1]}="${ref}" apunta a un archivo que no existe`);
  }

  // 6. Pantallas siguientes y límites de texto.
  for (const n of s.next || []) if (!existsSync(path.join(pub, n))) fail(id, `next: ${n} no existe`);
  for (const t of s.texts || []) {
    if (t.param == null) continue;
    if (!(t.param in params)) fail(id, `límite "${t.text}": la clave ${t.param} no está en params.json`);
    else if (params[t.param] !== t.max) fail(id, `límite "${t.text}": el manifiesto dice ${t.max} y params.json ${t.param} = ${params[t.param]}`);
  }
}

if (errors.length) {
  console.error(`check:front encontró ${errors.length} problema(s):\n- ${errors.join('\n- ')}`);
  process.exit(1);
}
console.log(`OK: ${manifest.screens.length} pantallas del manifiesto revisadas (puente: ${bridgeMethods.size} métodos en ${manifest.bridge.source}).`);
