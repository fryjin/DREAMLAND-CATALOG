function text(value){
  return String(value??'').trim();
}
function webPath(value){
  const source=text(value);
  if(!source)return '';
  if(source.startsWith('/')||source.startsWith('http://')||source.startsWith('https://'))return source;
  return '/'+source.replace(/^\.\//,'');
}
function activeProduct(product){
  const status=text(product?.status).toLowerCase();
  return !status||status==='active';
}
function productId(product){
  return text(product?.productId||product?.id);
}
function featuredCompare(a,b){
  const diff=(Number(b?.listSort)||Number(b?.sortOrder)||0)-(Number(a?.listSort)||Number(a?.sortOrder)||0);
  return diff||productId(a).localeCompare(productId(b));
}
export function buildMobileHomeStartupManifest({products=[],assets={}}={}){
  const batchSize=Math.max(1,Number(assets?.catalog?.batchSize)||24);
  const catalogImages=(Array.isArray(products)?products:[])
    .filter(activeProduct)
    .slice()
    .sort(featuredCompare)
    .map(product=>webPath(product?.cover_image))
    .filter(Boolean)
    .slice(0,batchSize);
  return Object.freeze({
    version:'R4.11B4.1C-A',
    cover:webPath(assets?.cover?.image),
    placeholder:webPath(assets?.cover?.placeholder),
    catalogBatchSize:batchSize,
    catalogImages:Object.freeze(catalogImages)
  });
}
