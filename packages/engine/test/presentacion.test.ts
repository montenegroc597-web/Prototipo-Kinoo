import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { PRESENTATION_DIR, presentationData } from '../sim/presentacion';

describe('explicación gráfica del algoritmo', () => {
  it('usa los mismos pesos, moods y catálogo que el motor (si falla: npm run docs:presentacion)', () => {
    const html = readFileSync(path.join(PRESENTATION_DIR, 'como-funciona-kinoo.html'), 'utf8');
    const json = html.match(/const DATA = (\{.*?\});\n/s)?.[1];
    expect(json).toBeTruthy();
    expect(JSON.parse(json as string)).toEqual(JSON.parse(JSON.stringify(presentationData())));
  });
});
