(function(){
  'use strict';

  const IMAGE_FIELDS = [
    'cover_image',
    'angle_image',
    'detail_image',
    'size_s_image',
    'size_m_image',
    'size_l_image',
    'size_xl_image',
    'packaging_image',
    'scene_image_1',
    'scene_image_2',
    'scene_image_3',
    'scene_image_4'
  ];

  function text(value){
    return String(value ?? '').trim();
  }

  function number(value,fallback=0){
    const parsed=Number(text(value));
    return Number.isFinite(parsed)?parsed:fallback;
  }

  function boolean(value){
    return ['1','true','yes','y','是'].includes(text(value).toLowerCase());
  }

  function splitList(value,separator=','){
    return text(value)
      .split(separator)
      .map(item=>item.trim())
      .filter(Boolean);
  }

  function parseCsv(csvText){
    const source=String(csvText||'').replace(/^\uFEFF/,'');
    const table=[];
    let row=[];
    let cell='';
    let quoted=false;

    for(let index=0;index<source.length;index++){
      const char=source[index];
      const next=source[index+1];

      if(char==='"'){
        if(quoted&&next==='"'){
          cell+='"';
          index++;
        }else{
          quoted=!quoted;
        }
        continue;
      }

      if(char===','&&!quoted){
        row.push(cell);
        cell='';
        continue;
      }

      if((char==='\n'||char==='\r')&&!quoted){
        if(char==='\r'&&next==='\n')index++;
        row.push(cell);
        cell='';
        if(row.some(value=>value!==''))table.push(row);
        row=[];
        continue;
      }

      cell+=char;
    }

    if(cell!==''||row.length){
      row.push(cell);
      if(row.some(value=>value!==''))table.push(row);
    }

    if(!table.length)return [];

    const headers=table.shift().map(value=>text(value));

    return table.map(values=>{
      const record={};
      headers.forEach((header,index)=>{
        record[header]=values[index]??'';
      });
      return record;
    });
  }

  function mapCsvProduct(row){
    const id=text(row.product_id);
    const defaultSize=text(row.default_size)||'S';

    const shortDescriptions={
      zh:text(row.short_desc_zh),
      en:text(row.short_desc_en),
      ko:text(row.short_desc_ko)
    };

    const detailDescriptions={
      zh:text(row.detail_desc_zh),
      en:text(row.detail_desc_en),
      ko:text(row.detail_desc_ko)
    };

    const product={
      id,
      productId:id,
      series:text(row.series),
      status:text(row.status).toLowerCase()||'hidden',
      sortOrder:number(row.sort_order),
      listSort:number(row.list_sort,number(row.sort_order)),
      name:text(row.name_zh)||id,
      names:{
        zh:text(row.name_zh)||id,
        en:text(row.name_en)||text(row.name_zh)||id,
        ko:text(row.name_ko)||text(row.name_zh)||id
      },
      desc:shortDescriptions.zh||detailDescriptions.zh,
      descriptions:{
        zh:shortDescriptions.zh||detailDescriptions.zh,
        en:shortDescriptions.en||detailDescriptions.en||shortDescriptions.zh,
        ko:shortDescriptions.ko||detailDescriptions.ko||shortDescriptions.zh
      },
      detailDescriptions,
      size:defaultSize,
      defaultSize,
      availableSizes:splitList(row.available_sizes),
      availablePatterns:text(row.available_patterns),
      availableScentSeries:splitList(row.available_scent_series),
      color:text(row.color_class)||'color-1',
      tags:{
        zh:splitList(row.tags_zh),
        en:splitList(row.tags_en),
        ko:splitList(row.tags_ko)
      },
      featured:boolean(row.featured),
      launchDate:text(row.launch_date),
      updatedAt:text(row.updated_at),
      colorCode:text(row.color_code),
      pdfSeriesLabel:text(row.pdf_series_label),
      pdfSourcePage:number(row.pdf_source_page)
    };

    IMAGE_FIELDS.forEach(field=>{
      product[field]=text(row[field]);
    });

    return product;
  }

function mapCsvScent(row) {
  const text = value => String(value || '').trim();

  return {
    id: text(row.scent_id),
    series: text(row.series),
    status: text(row.status),
    sortOrder: Number(row.sort_order || 999),

    name: {
      zh: text(row.name_zh),
      en: text(row.name_en),
      ko: text(row.name_ko)
    },

    notes: {
      top: {
        zh: text(row.top_zh),
        en: text(row.top_en),
        ko: text(row.top_ko)
      },
      heart: {
        zh: text(row.heart_zh),
        en: text(row.heart_en),
        ko: text(row.heart_ko)
      },
      base: {
        zh: text(row.base_zh),
        en: text(row.base_en),
        ko: text(row.base_ko)
      }
    },

    supplier: {
      zh: text(row.supplier_zh),
      en: text(row.supplier_en),
      ko: text(row.supplier_ko)
    },

    fragranceRatio: text(row.fragrance_ratio),
    updatedAt: text(row.updated_at)
  };
}
  
function mapCsvSharedAsset(row){
  return {
    assetId:text(row.asset_id),
    category:text(row.category).toLowerCase(),
    lookupKey:text(row.lookup_key),
    size:text(row.size).toUpperCase(),
    labels:{
      zh:text(row.label_zh),
      en:text(row.label_en),
      ko:text(row.label_ko)
    },
    imagePath:text(row.image_path),
    fallbackPath:text(row.fallback_path),
    status:text(row.status).toLowerCase()||'hidden',
    sortOrder:number(row.sort_order),
    updatedAt:text(row.updated_at)
  };
}

async function loadSharedAssetsFromCsv(){
  try{
    const response=await fetch(
      './data/shared-assets.csv',
      {cache:'no-cache'}
    );

    if(!response.ok){
      throw new Error(
        `shared-assets.csv request failed: ${response.status}`
      );
    }

    return parseCsv(await response.text())
      .map(mapCsvSharedAsset)
      .filter(
        item=>
          item.assetId&&
          item.status==='active'
      )
      .sort(
        (a,b)=>
          a.sortOrder-b.sortOrder
      );
  }catch(error){
    console.warn(
      '[catalog] Shared assets load failed; using legacy image paths.',
      error
    );

    return [];
  }
}

async function loadScentsFromCsv() {
  try {
    const response = await fetch('./data/scents.csv', {
      cache: 'no-cache'
    });

    if (!response.ok) {
      throw new Error(
        `Failed to load scents.csv: ${response.status}`
      );
    }

    const text = await response.text();
    const rows = parseCsv(text);

    return rows
      .map(mapCsvScent)
      .filter(item => item.id && item.status === 'active')
      .sort((a, b) => {
        if (a.series !== b.series) {
          return a.series.localeCompare(b.series);
        }

        return a.sortOrder - b.sortOrder;
      });
  } catch (error) {
    console.warn(
      '[DREAMLAND] scents.csv load failed.',
      error
    );

    return [];
  }
}
  
  function assertValidProducts(products){
    const ids=new Set();

    products.forEach(product=>{
      if(!product.id){
        throw new Error('CSV contains a product without product_id');
      }
      if(ids.has(product.id)){
        throw new Error(`CSV contains duplicate product_id: ${product.id}`);
      }
      ids.add(product.id);
    });
  }

  async function loadProductsFromCsv(){
    const response=await fetch('./data/products.csv',{cache:'no-cache'});
    if(!response.ok){
      throw new Error(`products.csv request failed: ${response.status}`);
    }

    const records=parseCsv(await response.text());
    const mapped=records.map(mapCsvProduct).filter(product=>product.id);
    assertValidProducts(mapped);

    const active=mapped.filter(product=>product.status==='active');
    if(!active.length){
      throw new Error('products.csv contains no active products');
    }

    return active;
  }

  async function loadProductsWithFallback(){
    try{
      return await loadProductsFromCsv();
    }catch(error){
      console.warn('[catalog] CSV load failed; using products.json fallback.',error);

      const response=await fetch('./data/products.json',{cache:'no-cache'});
      if(!response.ok){
        throw new Error(`products.json fallback failed: ${response.status}`);
      }

      const data=await response.json();
      return Array.isArray(data.products)?data.products:[];
    }
  }

window.DreamlandCatalogData={
  parseCsv,
  mapCsvProduct,
  mapCsvSharedAsset,
  loadProductsFromCsv,
  loadProductsWithFallback,
  mapCsvScent,
  loadScentsFromCsv,
  loadSharedAssetsFromCsv
};
})();

/* Load the dedicated image manager after the main page script is ready. */
(function(){
  function loadImageManager(){
    if(document.querySelector('script[data-dreamland-image-manager]'))return;

    const script=document.createElement('script');
    script.src='./image-manager.js';
    script.dataset.dreamlandImageManager='1';
    document.head.appendChild(script);
  }

  if(document.readyState==='loading'){
    document.addEventListener('DOMContentLoaded',loadImageManager,{once:true});
  }else{
    setTimeout(loadImageManager,0);
  }
})();
