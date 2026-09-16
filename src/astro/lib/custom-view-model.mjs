function text(value){
  return String(value??'').trim();
}

function localName(scent,language){
  return scent?.name?.[language]||scent?.name?.en||scent?.name?.zh||scent?.id||'';
}

function seriesLabel(series,language,seriesMeta={}){
  return seriesMeta?.[series]?.labels?.[language]||seriesMeta?.[series]?.labels?.en||seriesMeta?.[series]?.labels?.zh||series;
}

function localizedBudgetOptions(custom={},currency={}){
  const rows=Array.isArray(custom.budgets)?custom.budgets:[];
  const labels=Array.isArray(currency.budget)?currency.budget:[];
  return rows.map((row,index)=>Object.freeze({
    value:text(row?.value),
    label:text(labels[index]||row?.label||row?.value)
  }));
}

function normalizeOptions(rows=[]){
  return Object.freeze((Array.isArray(rows)?rows:[])
    .map(row=>Object.freeze({
      ...row,
      value:text(row?.value),
      label:text(row?.label||row?.value),
      body:text(row?.body)
    }))
    .filter(row=>row.value&&row.label));
}

function compactRuntimeView(view={}){
  return Object.freeze({
    content:Object.freeze({
      navigation:Object.freeze({...((view.content||{}).navigation||{})}),
      footer:Object.freeze({...((view.content||{}).footer||{})})
    }),
    copy:Object.freeze({...((view.copy)||{})}),
    useCases:Object.freeze([...(view.useCases||[])]),
    budgets:Object.freeze([...(view.budgets||[])]),
    sizes:Object.freeze([...(view.sizes||[])]),
    packages:Object.freeze([...(view.packages||[])]),
    brandingOptions:Object.freeze([...(view.brandingOptions||[])]),
    fragranceSeries:Object.freeze([...(view.fragranceSeries||[])])
  });
}

export function mapCustomScents(records=[]){
  return records
    .map(row=>({
      id:text(row?.scent_id),
      series:text(row?.series),
      status:text(row?.status).toLowerCase(),
      sortOrder:Number(row?.sort_order)||999,
      name:{zh:text(row?.name_zh),en:text(row?.name_en),ko:text(row?.name_ko)}
    }))
    .filter(scent=>scent.id&&scent.series)
    .sort((a,b)=>a.series===b.series?a.sortOrder-b.sortOrder:a.series.localeCompare(b.series));
}

export function groupCustomScents(scents=[]){
  const grouped=new Map();
  for(const scent of scents){
    if(!grouped.has(scent.series)) grouped.set(scent.series,[]);
    grouped.get(scent.series).push(scent);
  }
  return grouped;
}

export function buildCustomViewModel({
  language='en',siteContent={},i18n={},seriesDocument={},appConfig={},localizationPolicy,customFeature
}={}){
  if(!localizationPolicy||!customFeature){
    throw new Error('Custom ViewModel requires canonical Localization and Custom Feature owners.');
  }

  const localized=localizationPolicy.localizedContent(language,siteContent);
  const custom=localized.customProject||{};
  const snapshot=customFeature.snapshot();
  if(!snapshot?.ready){
    throw new Error('DreamlandCustom must be configured before building the Custom ViewModel.');
  }

  const series=customFeature.availableSeries().map(key=>Object.freeze({
    key,
    label:seriesLabel(key,language,seriesDocument.series||{}),
    scents:Object.freeze(customFeature.availableScents(key).map(scent=>Object.freeze({
      id:text(scent?.id),name:localName(scent,language)
    })))
  }));

  const currency=i18n.currencyMap?.[language]||i18n.currencyMap?.en||{};

  return Object.freeze({
    language,
    content:localized,
    copy:Object.freeze({...custom}),
    minimumQuantity:Number(snapshot.minimumQuantity)||Number(appConfig.customMoq)||1,
    maximumQuantity:Number(snapshot.maximumQuantity)||Number(appConfig.maxQuantity)||1000000,
    useCases:normalizeOptions(custom.useCases),
    budgets:Object.freeze(localizedBudgetOptions(custom,currency)),
    sizes:normalizeOptions(custom.sizes),
    packages:normalizeOptions(custom.packages),
    brandingOptions:normalizeOptions(custom.brandingOptions),
    fragranceSeries:Object.freeze(series),
    routes:Object.freeze({collection:'/products/',inquiry:'/inquiry/',custom:'/custom/'})
  });
}

export function buildCustomRuntimeState({
  languages=['en','zh','ko'],defaultLanguage='en',scents=[],siteContent={},i18n={},seriesDocument={},appConfig={},localizationPolicy,customFeature
}={}){
  if(!localizationPolicy||!customFeature||!customFeature.ready()){
    throw new Error('Custom Runtime State requires configured canonical Localization and Custom owners.');
  }

  const snapshot=customFeature.snapshot();
  const views=Object.freeze(Object.fromEntries(languages.map(language=>[
    language,
    compactRuntimeView(buildCustomViewModel({
      language,siteContent,i18n,seriesDocument,appConfig,localizationPolicy,customFeature
    }))
  ])));

  return Object.freeze({
    version:'R4.6B',
    defaultLanguage,
    storage:Object.freeze({
      languageKey:'productManualLang',
      inquiryKey:'productManualV2State',
      inquiryVersion:2
    }),
    limits:Object.freeze({
      customMoq:Number(snapshot.minimumQuantity)||1,
      maxQuantity:Number(snapshot.maximumQuantity)||1000000
    }),
    series:Object.freeze({
      order:Object.freeze([...customFeature.availableSeries()]),
      default:snapshot.selectedSeries||customFeature.availableSeries()?.[0]||'classic'
    }),
    scents:Object.freeze(scents.map(scent=>Object.freeze({
      id:text(scent?.id),series:text(scent?.series),status:text(scent?.status),sortOrder:Number(scent?.sortOrder)||999,
      name:Object.freeze({...((scent?.name)||{})})
    }))),
    languages:views
  });
}
