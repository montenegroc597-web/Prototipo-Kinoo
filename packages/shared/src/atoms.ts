/** Las 21 claves de átomo. La lista editable (etiquetas, descripciones) vive en data/config/atoms.json. */
export const ATOM_KEYS = [
  'frenetica', 'agil', 'pausada', 'contemplativa',
  'reconfortante', 'luminosa', 'melancolica', 'tensa', 'inquietante', 'sombria',
  'cruda', 'onirica', 'neon', 'pastel', 'calida', 'monocromatica',
  'carga_emocional', 'complejidad', 'humor', 'intimidad', 'escala_epica',
] as const;

export type AtomKey = (typeof ATOM_KEYS)[number];
export type AtomVector = Record<AtomKey, number>;
export type PartialAtomVector = Partial<Record<AtomKey, number>>;

export function isAtomKey(k: string): k is AtomKey {
  return (ATOM_KEYS as readonly string[]).includes(k);
}
