import {
  FRONTEND_LAYERS,
  ALLOWED_LAYER_DEPENDENCIES
} from './layers.js';

import {
  LEGACY_FRONTEND_MAP
} from './legacy-map.js';

import {
  FEATURE_MANIFEST
} from '../features/manifest.js';

import {
  UI_CONTRACTS
} from '../ui/contracts.js';

import {
  SERVICE_CONTRACTS
} from '../services/contracts.js';

/*
 * Architecture metadata only.
 *
 * B3-03 replaces the inquiry media render wrapper with explicit inquiry lifecycle events.
 * The foundation manifest itself is still NOT loaded by index.html.
 */
export const FRONTEND_FOUNDATION=Object.freeze({
  phase:'B3-03',
  runtimeIntegrated:true,
  runtimeIntegration:'partial',
  strategy:'progressive-migration',
  layers:FRONTEND_LAYERS,
  allowedDependencies:ALLOWED_LAYER_DEPENDENCIES,
  legacyMap:LEGACY_FRONTEND_MAP,
  features:FEATURE_MANIFEST,
  ui:UI_CONTRACTS,
  services:SERVICE_CONTRACTS
});

export function getFrontendFoundation(){
  return FRONTEND_FOUNDATION;
}
