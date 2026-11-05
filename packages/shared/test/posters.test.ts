import { describe, expect, it } from 'vitest';
import { fitText, posterUrl } from '../src';

describe('posterUrl', () => {
  it('poster_path de TMDB → CDN de TMDB con el tamaño pedido', () => {
    expect(posterUrl('/abc.jpg')).toBe('https://image.tmdb.org/t/p/w500/abc.jpg');
    expect(posterUrl('/abc.jpg', { size: 'w342' })).toBe('https://image.tmdb.org/t/p/w342/abc.jpg');
  });
  it('archivo del repositorio → base del sitio + ruta', () => {
    expect(posterUrl('posters/coco-2017.jpg', { assetBaseUrl: 'https://montenegroc597-web.github.io/Prototipo-Kinoo/' })).toBe(
      'https://montenegroc597-web.github.io/Prototipo-Kinoo/posters/coco-2017.jpg',
    );
    expect(posterUrl('posters/coco-2017.jpg', { assetBaseUrl: '../' })).toBe('../posters/coco-2017.jpg');
  });
  it('URL completa se respeta; sin póster → null', () => {
    expect(posterUrl('https://x/y.jpg')).toBe('https://x/y.jpg');
    expect(posterUrl(null)).toBeNull();
    expect(posterUrl('')).toBeNull();
  });
});

describe('fitText (estándar de caracteres de la carta)', () => {
  it('deja igual lo que cabe', () => {
    expect(fitText('Coco', 24)).toBe('Coco');
  });
  it('prefiere terminar en una frase completa', () => {
    expect(fitText('Un viaje al espacio. Luego vuelve a casa con su hija y todo cambia para siempre.', 40)).toBe('Un viaje al espacio.');
  });
  it('si no hay frase que quepa, corta en una palabra y agrega …', () => {
    const t = fitText('Eterno resplandor de una mente sin recuerdos', 24);
    expect(t).toBe('Eterno resplandor de…');
    expect(t.length).toBeLessThanOrEqual(24);
  });
  it('nunca supera el máximo', () => {
    for (const max of [10, 18, 44, 110]) expect(fitText('palabra '.repeat(40), max).length).toBeLessThanOrEqual(max);
  });
});
