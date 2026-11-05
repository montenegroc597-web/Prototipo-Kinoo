// Detector de textos que se salen de su caja o se montan sobre otros. Corre dentro de la página (page.evaluate).
// Raíz: la hoja abierta (si se pasa) o la app de 402 px. Ignora carruseles con desplazamiento horizontal.
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
  const inCarousel = (el: Element) => {
    for (let e: Element | null = el; e && e !== root; e = e.parentElement)
      if (getComputedStyle(e).overflowX === 'auto' || getComputedStyle(e).overflowX === 'scroll') return true;
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
    const box = (a ?? root).getBoundingClientRect();
    const over = Math.max(r.right - (box.right - 2), box.left + 2 - r.left, r.bottom - (box.bottom - 2));
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
