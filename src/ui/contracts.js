function uiContract(
  id,
  responsibility
){
  return Object.freeze({
    id,
    layer:'ui',
    runtimeEnabled:false,
    responsibility
  });
}

export const UI_CONTRACTS=Object.freeze([
  uiContract(
    'modal',
    'Dialog presentation and dismissal semantics.'
  ),
  uiContract(
    'sheet',
    'Bottom-sheet presentation and future drag lifecycle.'
  ),
  uiContract(
    'toast',
    'Transient feedback presentation.'
  ),
  uiContract(
    'carousel',
    'Generic direct-manipulation carousel surface.'
  ),
  uiContract(
    'tabs',
    'Series and section navigation controls.'
  ),
  uiContract(
    'bottom-navigation',
    'Primary mobile navigation surface.'
  )
]);
