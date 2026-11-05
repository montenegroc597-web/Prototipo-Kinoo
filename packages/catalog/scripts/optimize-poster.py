"""Optimiza un póster para web: 600 px de ancho máximo, JPEG calidad 82, sin metadatos.
Uso: python3 packages/catalog/scripts/optimize-poster.py <origen> <id-de-kinoo>
Escribe apps/web/public/posters/<id>.jpg. Después: npm run catalog:posters && npm run catalog:build && npm run db:seeds"""
import sys
from pathlib import Path
from PIL import Image

src, movie_id = sys.argv[1], sys.argv[2]
out = Path(__file__).resolve().parents[3] / 'apps/web/public/posters' / f'{movie_id}.jpg'
im = Image.open(src).convert('RGB')
if im.width > 600:
    im = im.resize((600, round(im.height * 600 / im.width)), Image.LANCZOS)
out.parent.mkdir(parents=True, exist_ok=True)
im.save(out, 'JPEG', quality=82, optimize=True, progressive=True)
print(f'{out.relative_to(out.parents[4])} · {im.width}×{im.height} · {out.stat().st_size // 1024} KB')
