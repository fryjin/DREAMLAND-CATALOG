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
 * B6-03 adds the Detail Feature state/configuration runtime.
 * DreamlandDetail owns active-product selection, Detail configuration state,
 * option-state mutation and Detail pricing/MOQ ViewModel derivation.
 * Detail DOM rendering, media/carousel/swipe lifecycle, screen navigation and
 * Inquiry mutation orchestration remain outside the Feature.
 *
 * Catalog, Contact, Inquiry and existing service ownership remains unchanged.
 * The foundation manifest itself is still NOT loaded by index.html.
 */
export const FRONTEND_FOUNDATION=Object.freeze({
  phase:'B6-03',
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
