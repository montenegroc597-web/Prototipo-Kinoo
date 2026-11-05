import { describe, expect, it } from 'vitest';
import { posterUrl } from '../src';

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
