// Personas simuladas para estudiar el perfilamiento con el catálogo real (69 películas).
// Cada persona tiene un gusto oculto en átomos; decide con ese gusto y un poco de ruido humano.
import type { PartialAtomVector } from '@kinoo/shared';

export interface Persona {
  key: string;
  name: string;
  description: string;
  /** Gusto oculto (lo que el motor tiene que descubrir). Negativo = lo evita. */
  taste: PartialAtomVector;
  /** Cómo entiende esta persona "Llorar bonito" (si lo usa). */
  cryTaste?: PartialAtomVector;
  /** Arquetipo que esperaríamos que le salga. */
  expectedArchetype: string;
}

export const PERSONAS: Persona[] = [
  {
    key: 'camilo',
    name: 'Camilo (hipótesis)',
    description: 'Cine de autor emotivo y de luz cálida; le atrae el terror psicológico; le aburren la comedia tonta y la acción ruidosa.',
    taste: {
      melancolica: 0.8,
      carga_emocional: 0.8,
      intimidad: 0.7,
      calida: 0.6,
      complejidad: 0.6,
      pausada: 0.5,
      inquietante: 0.5,
      contemplativa: 0.4,
      humor: -0.6,
      frenetica: -0.6,
      escala_epica: -0.4,
    },
    cryTaste: { carga_emocional: 0.9, intimidad: 0.8, pausada: 0.6, calida: 0.6, melancolica: 0.7, humor: -0.5 },
    expectedArchetype: 'romantico',
  },
  {
    key: 'acción',
    name: 'Valentina · adrenalina',
    description: 'Acción, ciencia ficción y espectáculo. Quiere que pase algo todo el tiempo.',
    taste: { frenetica: 0.8, escala_epica: 0.9, tensa: 0.6, agil: 0.7, neon: 0.3, contemplativa: -0.7, pausada: -0.5, intimidad: -0.3 },
    expectedArchetype: 'explorador',
  },
  {
    key: 'familia',
    name: 'Andrés · plan familiar',
    description: 'Animación y comedia para ver con los hijos. Nada oscuro.',
    taste: { humor: 0.8, reconfortante: 0.9, luminosa: 0.8, pastel: 0.4, agil: 0.4, sombria: -0.8, inquietante: -0.7, tensa: -0.4 },
    cryTaste: { carga_emocional: 0.8, reconfortante: 0.8, luminosa: 0.7, humor: 0.5 },
    expectedArchetype: 'luminoso',
  },
  {
    key: 'terror',
    name: 'Laura · noche de miedo',
    description: 'Terror y suspenso; mientras más inquietante, mejor.',
    taste: { inquietante: 0.9, sombria: 0.8, tensa: 0.8, onirica: 0.3, luminosa: -0.6, reconfortante: -0.6, humor: -0.3 },
    expectedArchetype: 'nocturno',
  },
  {
    key: 'clasicos',
    name: 'Jorge · cinéfilo de clásicos',
    description: 'Dramas densos y complejos, crimen, cine de los setenta.',
    taste: { complejidad: 0.9, sombria: 0.6, pausada: 0.6, cruda: 0.5, contemplativa: 0.4, monocromatica: 0.3, humor: -0.4, pastel: -0.4 },
    expectedArchetype: 'observador',
  },
  {
    key: 'mixto',
    name: 'Sofía · de todo un poco',
    description: 'Gusto amplio: comedias románticas y dramas luminosos; poco terror.',
    taste: { luminosa: 0.6, humor: 0.5, intimidad: 0.5, calida: 0.5, carga_emocional: 0.4, inquietante: -0.5, sombria: -0.4 },
    expectedArchetype: 'luminoso',
  },
];
