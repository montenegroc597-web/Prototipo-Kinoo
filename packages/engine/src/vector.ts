import { ATOM_KEYS, type AtomKey, type AtomVector, type PartialAtomVector } from '@kinoo/shared';

export function zeroVector(): AtomVector {
  const v = {} as AtomVector;
  for (const k of ATOM_KEYS) v[k] = 0;
  return v;
}

export function fromPartial(p: PartialAtomVector | undefined | null): AtomVector {
  const v = zeroVector();
  if (p)
    for (const k of ATOM_KEYS) {
      const x = p[k];
      if (typeof x === 'number' && Number.isFinite(x)) v[k] = x;
    }
  return v;
}

export function clamp(x: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, x));
}

export function dot(a: AtomVector, b: AtomVector): number {
  let s = 0;
  for (const k of ATOM_KEYS) s += a[k] * b[k];
  return s;
}

export function norm(a: AtomVector): number {
  return Math.sqrt(dot(a, a));
}

/** Coseno. Si algún vector es cero (perfil vacío, receta neutra) devuelve 0: "sin opinión". */
export function cosine(a: AtomVector, b: AtomVector): number {
  const na = norm(a);
  const nb = norm(b);
  if (na < 1e-9 || nb < 1e-9) return 0;
  return dot(a, b) / (na * nb);
}

export function topAtoms(v: AtomVector, n: number, opts: { positiveOnly?: boolean } = {}): AtomKey[] {
  return [...ATOM_KEYS]
    .filter((k) => !opts.positiveOnly || v[k] > 1e-9)
    .sort((x, y) => v[y] - v[x])
    .slice(0, n);
}

export function copyVector(v: AtomVector): AtomVector {
  return { ...v };
}
