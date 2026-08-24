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
 * B6-05 adds the Custom Request Feature runtime.
 * DreamlandCustom owns Custom scent-series/scent selection state, Custom
 * validation and canonical Custom intent construction.
 *
 * Custom DOM field collection, localized scent controls, navigation/toasts and
 * Inquiry insertion remain App/UI orchestration concerns.
 *
 * The foundation manifest itself is still NOT loaded by index.html.
 */
export const FRONTEND_FOUNDATION=Object.freeze({
  phase:'B6-05',
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
