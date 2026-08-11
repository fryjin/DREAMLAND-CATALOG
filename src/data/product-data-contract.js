(function(root){
  'use strict';

  if(root.DreamlandProductDataContract){
    return;
  }

  const IMAGE_FIELDS=Object.freeze([
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
  ]);

  const REQUIRED_PRODUCT_COLUMNS=Object.freeze([
    'product_id',
    'series',
    'status',
    'sort_order',
    'name_zh',
    'name_en',
    'name_ko',
    'short_desc_zh',
    'short_desc_en',
    'short_desc_ko',
    'detail_desc_zh',
    'detail_desc_en',
    'detail_desc_ko',
    'default_size',
    'available_sizes',
    'available_patterns',
    'available_scent_series',
    ...IMAGE_FIELDS,
    'tags_zh',
    'tags_en',
    'tags_ko',
    'featured',
    'launch_date',
    'updated_at',
    'color_class',
    'list_sort',
    'color_code',
    'pdf_series_label',
    'pdf_source_page'
  ]);

  /*
   * Kept here as part of the shared contract so browser/runtime and
   * generated fallback can never drift.
   *
   * The current CSV already contains C01/C02, so these are effectively
   * compatibility guards for older cached fallback data.
   */
  const PRODUCT_NAME_OVERRIDES=Object.freeze({
    HOL001:'C01',
    HOL002:'C02'
  });

  function text(value){
    return String(value??'').trim();
  }

  function number(value,fallback=0){
    const parsed=Number(text(value));
    return Number.isFinite(parsed)?parsed:fallback;
  }

  function boolean(value){
    return ['1','true','yes','y','是']
      .includes(text(value).toLowerCase());
  }

  function splitList(value,separator=','){
    return text(value)
      .split(separator)
      .map(item=>item.trim())
      .filter(Boolean);
  }

  function parseCsvDocument(csvText,options={}){
    const strict=Boolean(options.strict);
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

        if(row.some(value=>value!=='')){
          table.push(row);
        }

        row=[];
        continue;
      }

      cell+=char;
    }

    if(strict&&quoted){
      throw new Error('CSV contains an unclosed quoted field.');
    }

    if(cell!==''||row.length){
      row.push(cell);
      if(row.some(value=>value!=='')){
        table.push(row);
      }
    }

    if(!table.length){
      return {
        headers:[],
        records:[]
      };
    }

    const headers=table
      .shift()
      .map(value=>text(value));

    const records=table.map((values,rowIndex)=>{
      if(strict&&values.length!==headers.length){
        throw new Error(
          `CSV row ${rowIndex+2} has ${values.length} columns; `+
          `expected ${headers.length}.`
        );
      }

      const record={};

      headers.forEach((header,index)=>{
        record[header]=values[index]??'';
      });

      return record;
    });

    return {
      headers,
      records
    };
  }

  /*
   * Compatibility API used by catalog-data.js.
   * Default parsing intentionally remains permissive at runtime.
   */
  function parseCsv(csvText,options={}){
    return parseCsvDocument(
      csvText,
      options
    ).records;
  }

  function validateProductSource(headers,rows){
    const missing=REQUIRED_PRODUCT_COLUMNS
      .filter(column=>!headers.includes(column));

    if(missing.length){
      throw new Error(
        `products.csv is missing required columns: ${missing.join(', ')}`
      );
    }

    const ids=new Set();

    rows.forEach((row,index)=>{
      const id=text(row.product_id);

      if(!id){
        throw new Error(
          `products.csv row ${index+2} has no product_id.`
        );
      }

      if(ids.has(id)){
        throw new Error(
          `Duplicate product_id in products.csv: ${id}`
        );
      }

      ids.add(id);
    });
  }

  function applyProductOverrides(product){
    if(!product){
      return product;
    }

    const displayName=
      PRODUCT_NAME_OVERRIDES[product.id];

    if(!displayName){
      return product;
    }

    product.name=displayName;
    product.names={
      ...(product.names||{}),
      zh:displayName,
      en:displayName,
      ko:displayName
    };

    return product;
  }

  function mapCsvProduct(row){
    const id=text(row.product_id);
    const defaultSize=
      text(row.default_size)||'S';

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
      status:
        text(row.status).toLowerCase()||
        'hidden',
      sortOrder:
        number(row.sort_order),
      listSort:
        number(
          row.list_sort,
          number(row.sort_order)
        ),
      name:
        text(row.name_zh)||
        id,
      names:{
        zh:
          text(row.name_zh)||
          id,
        en:
          text(row.name_en)||
          text(row.name_zh)||
          id,
        ko:
          text(row.name_ko)||
          text(row.name_zh)||
          id
      },
      desc:
        shortDescriptions.zh||
        detailDescriptions.zh,
      descriptions:{
        zh:
          shortDescriptions.zh||
          detailDescriptions.zh,
        en:
          shortDescriptions.en||
          detailDescriptions.en||
          shortDescriptions.zh,
        ko:
          shortDescriptions.ko||
          detailDescriptions.ko||
          shortDescriptions.zh
      },
      detailDescriptions,
      size:defaultSize,
      defaultSize,
      availableSizes:
        splitList(row.available_sizes),
      availablePatterns:
        text(row.available_patterns),
      availableScentSeries:
        splitList(
          row.available_scent_series
        ),
      color:
        text(row.color_class)||
        'color-1',
      tags:{
        zh:splitList(row.tags_zh),
        en:splitList(row.tags_en),
        ko:splitList(row.tags_ko)
      },
      featured:
        boolean(row.featured),
      launchDate:
        text(row.launch_date),
      updatedAt:
        text(row.updated_at),
      colorCode:
        text(row.color_code),
      pdfSeriesLabel:
        text(row.pdf_series_label),
      pdfSourcePage:
        number(row.pdf_source_page)
    };

    IMAGE_FIELDS.forEach(field=>{
      product[field]=
        text(row[field]);
    });

    return applyProductOverrides(
      product
    );
  }

  function mapProductRecords(records){
    return records
      .map(mapCsvProduct)
      .filter(product=>product.id);
  }

  function activeProducts(products){
    return products.filter(
      product=>
        product.status==='active'
    );
  }

  function buildProductFallbackDocument(csvText){
    const {
      headers,
      records
    }=parseCsvDocument(
      csvText,
      {strict:true}
    );

    validateProductSource(
      headers,
      records
    );

    const products=
      activeProducts(
        mapProductRecords(records)
      );

    if(!products.length){
      throw new Error(
        'No active products were generated for products.json.'
      );
    }

    if(
      products.some(
        product=>
          product.status!=='active'
      )
    ){
      throw new Error(
        'Generated products.json contains a non-active product.'
      );
    }

    return {
      schemaVersion:1,
      products
    };
  }

  root.DreamlandProductDataContract=
    Object.freeze({
      IMAGE_FIELDS,
      REQUIRED_PRODUCT_COLUMNS,
      PRODUCT_NAME_OVERRIDES,
      text,
      number,
      boolean,
      splitList,
      parseCsvDocument,
      parseCsv,
      validateProductSource,
      applyProductOverrides,
      mapCsvProduct,
      mapProductRecords,
      activeProducts,
      buildProductFallbackDocument
    });
})(
  typeof globalThis!=='undefined'
    ? globalThis
    : this
);
