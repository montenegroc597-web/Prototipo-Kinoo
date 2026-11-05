// Juez sintético (12.3): convierte los metadatos de cada película en sus 21 átomos, frase gancho y pilares.
//
//   node scripts/catalog/tag.mjs prompts [--input data/catalog/seed_movies.json] [--batch-size 17]
//       Escribe un prompt por lote en data/catalog/batches/. Sirve para etiquetar con subagentes
//       (cada uno lee su prompt y escribe batch-XX.tagged.json) o a mano.
//   node scripts/catalog/tag.mjs api [--model claude-haiku-5-5]
//       Si hay ANTHROPIC_API_KEY, manda cada prompt a la API y escribe batch-XX.tagged.json.
//
// Calibración: las anclas del grupo A sirven de ejemplo en los lotes que etiquetan anclas del grupo B, y al revés.
import { existsSync, readdirSync, readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { ATOMS, ATOM_KEYS, PILLARS, PROMPT_VERSION, arg, p, readJson, writeJson } from './lib.mjs';

const mode = process.argv[2];
const BATCH_DIR = 'data/catalog/batches';

function schemaText() {
  return `Devuelve SOLO un JSON válido con esta forma, sin texto alrededor:
{"movies": [{"id": "<id tal cual>", "atoms": {${ATOM_KEYS.map((k) => `"${k}": 0.0`).join(', ')}}, "hook": "<FRASE GANCHO>", "pillars": {"ritmo": "<1 a 3 palabras>", "tono": "<1 a 3 palabras>", "historia": "<1 a 4 palabras>", "visual": "<1 a 3 palabras>"}}]}`;
}

export function buildPrompt(movies, examples) {
  const atomList = ATOMS.map((a) => `- ${a.key} (${a.dimension}): ${a.description}`).join('\n');
  const ex = examples.map((e) => `${e.title} (${e.year}): ${JSON.stringify(e.atoms)}`).join('\n');
  const list = movies.map((m) => `- id: ${m.id} | ${m.title}${m.original_title ? ` / ${m.original_title}` : ''} (${m.year}) | dirección: ${m.directors.join(', ')} | géneros: ${m.genres.join(', ')}${m.overview ? ` | sinopsis: ${m.overview}` : ''}`).join('\n');
  return `Eres el juez sintético de Kinoo, una app colombiana para decidir qué película ver. Describe cada película con 21 átomos de 0.0 a 1.0. Los átomos son independientes (una película puede ser melancólica y luminosa a la vez). Describen la película, no la ocasión.

## Átomos
${atomList}

## Cómo puntuar
- Usa los extremos cuando corresponde: 0.0 si la película no tiene nada de ese rasgo; 0.9 o más si es de lo más representativo del cine en ese rasgo.
- No pongas todo cerca de 0.5. Una película típica tiene 3 a 6 átomos altos (≥ 0.6) y muchos bajos (≤ 0.2).
- "frenetica" y "contemplativa" casi nunca son altas a la vez.
- Valores con dos decimales como máximo.

## Ejemplos de calibración (valores fijados por el equipo)
${ex}

## Frase gancho (cara A de la carta)
- Máximo 160 caracteres, TODO EN MAYÚSCULAS, en español.
- Cuenta la premisa sin nombres de actores, directores, personajes famosos ni franquicias (nada de "Batman", "Nolan", "Vengadores").
- Sin revelar giros del final.

## Pilares (reverso de la carta)
Cuatro etiquetas cortas en minúscula y en español: ritmo (p. ej. "pausado", "vibrante"), tono (p. ej. "melancólico", "cálido"), historia (p. ej. "amor a destiempo"), visual (p. ej. "neón nocturno").

## Películas
${list}

${schemaText()}`;
}

function groups() {
  const a = existsSync(p('data/catalog/anchors.json')) ? readJson('data/catalog/anchors.json').anchors : [];
  return { A: a.filter((x) => x.group === 'A'), B: a.filter((x) => x.group === 'B') };
}

if (mode === 'prompts') {
  const input = readJson(arg('input', 'data/catalog/seed_movies.json')).movies;
  const size = Number(arg('batch-size', '20'));
  const byId = new Map(input.map((m) => [m.id, m]));
  const g = groups();
  const anchorIds = new Set([...g.A, ...g.B].map((x) => x.id));
  const rest = input.filter((m) => !anchorIds.has(m.id));
  const nBatches = Math.max(2, Math.ceil(input.length / size));
  const batches = Array.from({ length: nBatches }, () => []);
  // Lotes pares etiquetan las anclas B (con ejemplos A); impares, las A (con ejemplos B).
  g.B.forEach((x) => byId.has(x.id) && batches[0].push(byId.get(x.id)));
  g.A.forEach((x) => byId.has(x.id) && batches[1].push(byId.get(x.id)));
  rest.forEach((m, i) => { batches.sort((x, y) => x.length - y.length); batches[0].push(m); void i; });
  mkdirSync(p(BATCH_DIR), { recursive: true });
  const withTitle = (xs) => xs.map((x) => ({ ...x, title: byId.get(x.id)?.title ?? x.id, year: byId.get(x.id)?.year ?? '' }));
  batches.forEach((b, i) => {
    const hasA = b.some((m) => g.A.some((x) => x.id === m.id));
    const examples = withTitle(hasA ? g.B : g.A);
    const name = `batch-${String(i + 1).padStart(2, '0')}`;
    writeFileSync(p(BATCH_DIR, `${name}.prompt.md`), buildPrompt(b, examples));
    writeJson(`${BATCH_DIR}/${name}.ids.json`, b.map((m) => m.id));
  });
  console.log(`${batches.length} lotes en ${BATCH_DIR}/ (${input.length} películas)`);
} else if (mode === 'api') {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) { console.error('Falta ANTHROPIC_API_KEY. Etiqueta con subagentes leyendo los .prompt.md.'); process.exit(2); }
  const model = arg('model', process.env.KINOO_TAGGER_MODEL || 'claude-haiku-5-5');
  for (const f of readdirSync(p(BATCH_DIR)).filter((f) => f.endsWith('.prompt.md')).sort()) {
    const out = f.replace('.prompt.md', '.tagged.json');
    if (existsSync(p(BATCH_DIR, out))) continue;
    const prompt = readFileSync(p(BATCH_DIR, f), 'utf8');
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-api-key': key, 'anthropic-version': '2023-06-01' },
      body: JSON.stringify({ model, max_tokens: 16000, messages: [{ role: 'user', content: prompt }] }),
    });
    if (!res.ok) { console.error(`${f}: ${res.status} ${await res.text()}`); process.exit(1); }
    const body = await res.json();
    const text = body.content.map((c) => c.text ?? '').join('');
    const json = JSON.parse(text.slice(text.indexOf('{'), text.lastIndexOf('}') + 1));
    writeJson(`${BATCH_DIR}/${out}`, { tagger_model: model, prompt_version: PROMPT_VERSION, tagged_at: new Date().toISOString(), ...json });
    console.log(`etiquetado ${out}`);
  }
} else {
  console.error('Uso: tag.mjs prompts | api');
  process.exit(1);
}
export { PILLARS };
