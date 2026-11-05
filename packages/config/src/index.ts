// Junta los JSON de configuración en un EngineConfig. El motor la recibe como parámetro; no lee archivos.
import type { EngineConfig } from '@kinoo/shared';
import actionWeights from '../data/action_weights.json';
import archetypesFile from '../data/archetypes.json';
import atoms from '../data/atoms.json';
import deckRecipes from '../data/deck_recipes.json';
import templates from '../data/explanation_templates.json';
import params from '../data/params.json';
import vibes from '../data/vibes.json';

const { _doc, ...p } = params as typeof params & { _doc?: string };

export const defaultConfig: EngineConfig = {
  atoms: atoms.atoms as EngineConfig['atoms'],
  vibes: vibes.vibes as EngineConfig['vibes'],
  actionWeights: actionWeights.weights,
  deckRecipes: deckRecipes.recipes as EngineConfig['deckRecipes'],
  templates: templates.templates,
  archetypes: archetypesFile.archetypes as EngineConfig['archetypes'],
  params: p as EngineConfig['params'],
};
