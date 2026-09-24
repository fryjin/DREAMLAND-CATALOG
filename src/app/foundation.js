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
 * B6-06 removes the shared compatibility layer left by the progressive migration.
 * Detail media/preview adapters now read frozen state directly from
 * DreamlandDetail; Inquiry media reads/writes route through DreamlandInquiry.
 * PatternPreviewSwipe and CopyPolish are explicit adapters and no longer
 * replace App globals.
 *
 * The foundation manifest itself is still NOT loaded by index.html.
 */
export const FRONTEND_FOUNDATION=Object.freeze({
  phase:'B6-06',
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
