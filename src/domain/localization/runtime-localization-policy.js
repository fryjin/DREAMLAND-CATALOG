(function(root){
  'use strict';

  if(root.DreamlandLocalizationPolicy){
    return;
  }

  const VERSION='R4.2C';

  function text(value){
    return String(value??'').trim();
  }

  function uiText(language,key,uiDict={},fallbackLanguage='zh'){
    return (
      uiDict?.[language]?.[key]||
      uiDict?.[fallbackLanguage]?.[key]||
      key
    );
  }

  function choiceLabel(language,value,choiceMaps={}){
    return choiceMaps?.[language]?.[value]||value;
  }

  function seriesLabel(language,key,seriesTabLabels={},seriesMeta={},fallbackLanguage='zh'){
    return (
      seriesTabLabels?.[language]?.[key]||
      seriesTabLabels?.[fallbackLanguage]?.[key]||
      seriesMeta?.[key]?.name||
      key
    );
  }

  function productName(language,product){
    if(!product)return '';
    return (
      product.names?.[language]||
      product.names?.zh||
      product.name||
      product.id||
      ''
    );
  }

  function productDescription(language,product){
    if(!product)return '';
    return (
      product.descriptions?.[language]||
      product.descriptions?.zh||
      product.desc||
      ''
    );
  }

  function scentText(language,value){
    if(!value)return '';
    return value?.[language]||value?.en||value?.zh||'';
  }

  function fromPrice(language,label,amount){
    return language==='en'
      ? text(label)+' '+text(amount)
      : text(amount)+' '+text(label);
  }

  function localeFor(language,currencyMap={},fallback='zh-CN'){
    return currencyMap?.[language]?.locale||fallback;
  }

  function formatDate(value,language,currencyMap={}){
    const date=value instanceof Date?value:new Date(value);
    if(Number.isNaN(date.getTime()))return '';
    return date.toLocaleDateString(localeFor(language,currencyMap));
  }

  function localizedContent(language,siteContent={}){
    const languages=
      siteContent?.languages||
      {};

    return (
      languages?.[language]||
      languages?.en||
      languages?.zh||
      {}
    );
  }

  root.DreamlandLocalizationPolicy=Object.freeze({
    version:VERSION,
    uiText,
    choiceLabel,
    seriesLabel,
    productName,
    productDescription,
    scentText,
    fromPrice,
    localeFor,
    formatDate,
    localizedContent
  });
})(typeof globalThis!=='undefined'?globalThis:this);
