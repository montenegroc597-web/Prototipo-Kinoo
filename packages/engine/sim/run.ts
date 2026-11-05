// Corre las cinco pruebas de aprendizaje y escribe los resultados en sim/RESULTADOS.md y sim/results.json.
// Uso: npm run sim
import { writeFileSync } from 'node:fs';
import path from 'node:path';
import { defaultConfig } from '@kinoo/config';
import { runAll } from './scenarios';

const results = runAll(defaultConfig);
const dir = path.dirname(new URL(import.meta.url).pathname);
writeFileSync(path.join(dir, 'results.json'), JSON.stringify({ generated_at: new Date().toISOString(), results }, null, 2) + '\n');
const md = [
  '# Resultados del simulador',
  '',
  `Generado: ${new Date().toISOString()} · catálogo sintético de 300 películas · \`npm run sim\``,
  '',
  '| Prueba | ¿Pasa? | Criterio | Métricas |',
  '|---|---|---|---|',
  ...results.map(
    (r) =>
      `| ${r.name} | ${r.pass ? '✅' : '❌'} | ${r.criterion} | ${Object.entries(r.metrics)
        .filter(([k]) => !k.startsWith('_'))
        .map(([k, v]) => `${k}: ${v}`)
        .join(' · ')} |`,
  ),
  '',
];
writeFileSync(path.join(dir, 'RESULTADOS.md'), md.join('\n'));
for (const r of results) console.log(`${r.pass ? 'OK ' : 'NO '} ${r.name}: ${JSON.stringify(r.metrics)}`);
if (results.some((r) => !r.pass)) process.exitCode = 1;
