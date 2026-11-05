// Junta los JSON de configuración en un EngineConfig. El motor la recibe como parámetro; no lee archivos.
import type { EngineConfig } from '@kinoo/shared';
import atoms from './atoms.json';
import vibes from './vibes.json';
import actionWeights from './action_weights.json';
import deckRecipes from './deck_recipes.json';
import templates from './explanation_templates.json';
import archetypes from './tarot_archetypes.json';
import params from './params.json';

const { _doc, ...p } = params as typeof params & { _doc?: string };

export const defaultConfig: EngineConfig = {
  atoms: atoms.atoms as EngineConfig['atoms'],
  vibes: vibes.vibes as EngineConfig['vibes'],
  actionWeights: actionWeights.weights,
  deckRecipes: deckRecipes.recipes as EngineConfig['deckRecipes'],
  templates: templates.templates,
  archetypes: archetypes.archetypes as EngineConfig['archetypes'],
  params: p as EngineConfig['params'],
};
