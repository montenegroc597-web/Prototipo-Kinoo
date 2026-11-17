// Detector de textos que se salen de su caja o se montan sobre otros. Corre dentro de la página (page.evaluate).
// Raíz: la hoja abierta (si se pasa) o la app de 402 px. Ignora carruseles (contenedores que se desplazan en horizontal);
// los contenedores con scroll vertical sí se miden (ancho y choques), sin contar lo que queda debajo del borde.
export function auditTexts(rootSelector: string | null): string[] {
  const app = document.querySelector('body > div > div > div') as HTMLElement;
  let root: HTMLElement = app;
  if (rootSelector) {
    const t = [...document.querySelectorAll('p')].find((e) => e.innerText.trim() === rootSelector);
    let e = t as HTMLElement | null | undefined;
    while (e && !(e.getBoundingClientRect().width >= 400 && getComputedStyle(e).borderTopLeftRadius !== '0px')) e = e.parentElement;
    if (e) root = e;
  }
  const R = app.getBoundingClientRect();
  const out: string[] = [];
  const visible = (el: Element) => {
    for (let e: Element | null = el; e && e !== document.body; e = e.parentElement) {
      const cs = getComputedStyle(e);
      if (cs.visibility === 'hidden' || cs.display === 'none' || Number.parseFloat(cs.opacity) < 0.05) return false;
    }
    return true;
  };
  const ownText = (el: Element) => [...el.childNodes].some((n) => n.nodeType === 3 && n.textContent?.trim());
  // Carrusel = contenedor que de verdad se desplaza en horizontal (lo que sobra a la derecha es a propósito).
  // Un contenedor con scroll solo vertical (.kscroll de Ver) también tiene overflow-x auto en el CSS calculado: ese no es carrusel.
  const scrollsX = (e: Element) => {
    const o = getComputedStyle(e).overflowX;
    return (o === 'auto' || o === 'scroll') && e.scrollWidth > e.clientWidth + 1;
  };
  const scrollsY = (e: Element) => {
    const o = getComputedStyle(e).overflowY;
    return o === 'auto' || o === 'scroll';
  };
  const inCarousel = (el: Element) => {
    for (let e: Element | null = el; e && e !== root; e = e.parentElement) if (scrollsX(e)) return true;
    return false;
  };
  const rectOf = (el: Element) => {
    const rg = document.createRange();
    rg.selectNodeContents(el);
    const rs = [...rg.getClientRects()];
    if (!rs.length) return null;
    return {
      left: Math.min(...rs.map((r) => r.left)),
      right: Math.max(...rs.map((r) => r.right)),
      top: Math.min(...rs.map((r) => r.top)),
      bottom: Math.max(...rs.map((r) => r.bottom)),
    };
  };
  const items = [...root.querySelectorAll('*')]
    .filter((el) => ownText(el) && visible(el) && !inCarousel(el))
    .map((el) => ({ el, r: rectOf(el), t: (el as HTMLElement).innerText.trim().replace(/\s+/g, ' ').slice(0, 50) }))
    .filter((x): x is { el: Element; r: NonNullable<ReturnType<typeof rectOf>>; t: string } => !!x.r && x.r.right - x.r.left > 0);
  for (const { el, r, t } of items) {
    let a = el.parentElement;
    while (a && a !== root) {
      const s = getComputedStyle(a);
      const boxed =
        s.overflow !== 'visible' ||
        Number.parseFloat(s.borderTopWidth) > 0 ||
        Number.parseFloat(s.borderRadius) > 2 ||
        !['rgba(0, 0, 0, 0)', 'transparent'].includes(s.backgroundColor);
      if (boxed) break;
      a = a.parentElement;
    }
    const boxEl = a ?? root;
    const box = boxEl.getBoundingClientRect();
    // Margen de 2 px solo si la caja se ve (borde, esquinas o fondo): el texto no debe tocar el borde dibujado.
    // Una caja que solo recorta (overflow, p. ej. con "…") se mide contra su borde exacto.
    const bs = getComputedStyle(boxEl);
    const drawn =
      Number.parseFloat(bs.borderTopWidth) > 0 || Number.parseFloat(bs.borderRadius) > 2 || !['rgba(0, 0, 0, 0)', 'transparent'].includes(bs.backgroundColor);
    const m = drawn ? 2 : 0;
    // Abajo, una caja que solo recorta admite 4 px: la caja de las letras (ascendentes y descendentes de Big Shoulders)
    // es más alta que un line-height ajustado sin que se corte nada visible.
    // En un contenedor con scroll vertical, lo que queda debajo se ve al bajar: solo cuenta el ancho.
    const below = scrollsY(boxEl) ? Number.NEGATIVE_INFINITY : r.bottom - (box.bottom - (drawn ? 2 : -4));
    const over = Math.max(r.right - (box.right - m), box.left + m - r.left, below);
    if (over > 1.5 && box.width < R.width + 1) out.push(`se sale de su caja (+${Math.round(over)} px): ${t}`);
    else if (r.right > R.right + 1) out.push(`se sale de la pantalla (+${Math.round(r.right - R.right)} px): ${t}`);
  }
  for (let i = 0; i < items.length; i++) {
    for (let j = i + 1; j < items.length; j++) {
      const A = items[i]!;
      const B = items[j]!;
      // Textos en la misma línea del mismo párrafo ("Por qué hoy:" + razón) no son un choque.
      if (A.el.contains(B.el) || B.el.contains(A.el) || A.el.parentElement === B.el.parentElement) continue;
      const ix = Math.min(A.r.right, B.r.right) - Math.max(A.r.left, B.r.left);
      const iy = Math.min(A.r.bottom, B.r.bottom) - Math.max(A.r.top, B.r.top);
      const minH = Math.min(A.r.bottom - A.r.top, B.r.bottom - B.r.top);
      if (ix > 3 && iy > Math.max(3, 0.45 * minH)) out.push(`se monta: "${A.t}" con "${B.t}"`);
    }
  }
  return [...new Set(out)];
}
