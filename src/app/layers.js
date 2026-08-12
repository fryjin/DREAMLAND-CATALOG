export const FRONTEND_LAYERS=Object.freeze([
  'app',
  'features',
  'ui',
  'services',
  'data'
]);

export const ALLOWED_LAYER_DEPENDENCIES=Object.freeze({
  app:Object.freeze([
    'features',
    'ui',
    'services',
    'data'
  ]),
  features:Object.freeze([
    'ui',
    'services',
    'data'
  ]),
  ui:Object.freeze([]),
  services:Object.freeze([
    'data'
  ]),
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
