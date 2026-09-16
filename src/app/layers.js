export const FRONTEND_LAYERS=Object.freeze([
  'app',
  'features',
  'ui',
  'services',
  'domain',
  'data'
]);

export const ALLOWED_LAYER_DEPENDENCIES=Object.freeze({
  app:Object.freeze([
    'features',
    'ui',
    'services',
    'domain',
    'data'
  ]),
  features:Object.freeze([
    'ui',
    'services',
    'domain',
    'data'
  ]),
  ui:Object.freeze([]),
  services:Object.freeze([
    'domain',
    'data'
  ]),
  domain:Object.freeze([]),
  data:Object.freeze([])
});

export function canLayerDependOn(fromLayer,toLayer){
  if(fromLayer===toLayer){
    return true;
  }

  return Boolean(
    ALLOWED_LAYER_DEPENDENCIES[fromLayer]
      ?.includes(toLayer)
  );
}
