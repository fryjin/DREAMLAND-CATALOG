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
 * B6-04 adds the Detail UI Renderer runtime.
 * DreamlandDetailRenderer owns the Detail configuration-card DOM, option /
 * scent / quantity presentation, delegated configuration events and horizontal
 * option-scroll lifecycle while consuming DreamlandDetail ViewModels through
 * the App bridge.
 *
 * Detail media/carousel/swipe, shared preview modals, screen navigation and
 * Inquiry mutation orchestration remain outside the Detail Renderer.
 *
 * The foundation manifest itself is still NOT loaded by index.html.
 */
export const FRONTEND_FOUNDATION=Object.freeze({
  phase:'B6-04',
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
