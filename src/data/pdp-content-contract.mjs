const SUPPORTED_LOCALES=Object.freeze([
  'zh',
  'en',
  'ko'
]);

const COPY_STATUSES=Object.freeze([
  'pending-review',
  'approved'
]);

const COLOR_STORY_KINDS=Object.freeze([
  'story',
  'placeholder'
]);

function text(value){
  return String(
    value??
    ''
  ).trim();
}

function copyBlock(value={}){
  const copy=
    value?.copy||
    {};

  return Object.freeze({
    status:
      COPY_STATUSES.includes(
        text(
          value?.status
        )
      )
        ? text(
            value.status
          )
        : 'pending-review',
    copy:Object.freeze(
      Object.fromEntries(
        SUPPORTED_LOCALES.map(
          locale=>[
            locale,
            text(
              copy?.[locale]
            )
          ]
        )
      )
    )
  });
}

export function approvedLocalizedCopy(
  value,
  language='en'
){
  const block=
    copyBlock(
      value
    );

  if(
    block.status!==
    'approved'
  ){
    return '';
  }

  const locale=
    SUPPORTED_LOCALES.includes(
      text(
        language
      )
    )
      ? text(
          language
        )
      : 'en';

  return (
    block.copy[locale]||
    block.copy.en||
    block.copy.zh||
    ''
  );
}

export function colorStoryEntry(
  document,
  productId
){
  const id=
    text(
      productId
    )
      .toUpperCase();

  if(!id){
    return null;
  }

  const entry=
    document?.colorStories
      ?.[id];

  if(!entry){
    return null;
  }

  const kind=
    COLOR_STORY_KINDS.includes(
      text(
        entry?.kind
      )
    )
      ? text(
          entry.kind
        )
      : 'story';

  return Object.freeze({
    productId:id,
    kind,
    sourceProductId:
      text(
        entry?.sourceProductId
      )
        .toUpperCase(),
    ...copyBlock(
      entry
    )
  });
}

export function colorStoryFor(
  document,
  productId,
  language='en'
){
  return approvedLocalizedCopy(
    colorStoryEntry(
      document,
      productId
    ),
    language
  );
}

export function scentStandardFor(
  document,
  scentSeries
){
  const key=
    text(
      scentSeries
    );

  const standard=
    document?.scentStandards
      ?.[key];

  if(!standard){
    return null;
  }

  return Object.freeze({
    id:key,
    supplier:Object.freeze({
      zh:text(
        standard?.supplier?.zh
      ),
      en:text(
        standard?.supplier?.en
      ),
      ko:text(
        standard?.supplier?.ko
      )
    }),
    fragranceRatio:
      text(
        standard?.fragranceRatio
      ),
    helperCopy:
      copyBlock(
        standard?.helperCopy
      )
  });
}

export function quantityRule(
  document
){
  const rule=
    document?.quantityHelper||
    {};

  return Object.freeze({
    ruleId:
      text(
        rule?.ruleId
      ),
    aggregationKey:Object.freeze(
      Array.isArray(
        rule?.aggregationKey
      )
        ? rule
            .aggregationKey
            .map(text)
            .filter(Boolean)
        : []
    ),
    allowMixedProducts:
      rule?.allowMixedProducts===
      true,
    allowCrossSize:
      rule?.allowCrossSize===
      true,
    helperCopy:
      copyBlock(
        rule?.helperCopy
      )
  });
}

function unique(values=[]){
  return [
    ...new Set(
      values
        .map(text)
        .filter(Boolean)
    )
  ];
}

export function validatePdpContentDocument(
  document,
  {
    activeProductIds=[],
    scentRows=[],
    seriesDocument={}
  }={}
){
  const errors=[];

  const fail=
    message=>
      errors.push(
        message
      );

  if(
    Number(
      document?.schemaVersion
    )!==1
  ){
    fail(
      'schemaVersion must be 1.'
    );
  }

  if(
    JSON.stringify(
      document?.locales
    )!==
    JSON.stringify(
      SUPPORTED_LOCALES
    )
  ){
    fail(
      'locales must be exactly zh/en/ko.'
    );
  }

  const stories=
    document?.colorStories||
    {};

  const expectedIds=
    unique(
      activeProductIds
    )
      .map(
        value=>
          value.toUpperCase()
      )
      .sort();

  const storyIds=
    Object.keys(
      stories
    )
      .map(
        value=>
          value.toUpperCase()
      )
      .sort();

  if(
    JSON.stringify(
      expectedIds
    )!==
    JSON.stringify(
      storyIds
    )
  ){
    fail(
      'colorStories must cover active Product IDs exactly once.'
    );
  }

  const activeSet=
    new Set(
      expectedIds
    );

  for(const id of storyIds){
    const entry=
      colorStoryEntry(
        document,
        id
      );

    if(!entry){
      fail(
        id+
        ' Color Story entry is unavailable.'
      );
      continue;
    }

    if(
      !COLOR_STORY_KINDS.includes(
        entry.kind
      )
    ){
      fail(
        id+
        ' Color Story kind is invalid.'
      );
    }

    if(
      entry.status===
        'approved'&&
      SUPPORTED_LOCALES.some(
        locale=>
          !entry.copy[locale]
      )
    ){
      fail(
        id+
        ' approved Color Story must contain zh/en/ko copy.'
      );
    }

    if(
      entry.kind===
        'placeholder'&&
      entry.status!==
        'approved'
    ){
      fail(
        id+
        ' placeholder Color Story must be approved as the temporary presentation copy.'
      );
    }

    if(
      entry.sourceProductId&&
      !activeSet.has(
        entry.sourceProductId
      )
    ){
      fail(
        id+
        ' sourceProductId must reference one active Product ID.'
      );
    }
  }

  const standardIds=
    Object.keys(
      document?.scentStandards||
      {}
    ).sort();

  if(
    JSON.stringify(
      standardIds
    )!==
    JSON.stringify([
      'advanced',
      'classic',
      'masterpiece'
    ])
  ){
    fail(
      'scentStandards must contain classic/advanced/masterpiece only.'
    );
  }

  for(const seriesId of standardIds){
    const standard=
      scentStandardFor(
        document,
        seriesId
      );

    const rows=
      scentRows.filter(
        row=>
          text(
            row?.series
          )===
            seriesId&&
          text(
            row?.status
          )
            .toLowerCase()===
            'active'
      );

    if(!rows.length){
      fail(
        'No active scent rows found for '+
        seriesId+
        '.'
      );
      continue;
    }

    const supplierZh=
      unique(
        rows.map(
          row=>
            row?.supplier_zh
        )
      );

    const supplierEn=
      unique(
        rows.map(
          row=>
            row?.supplier_en
        )
      );

    const supplierKo=
      unique(
        rows.map(
          row=>
            row?.supplier_ko
        )
      );

    const ratios=
      unique(
        rows.map(
          row=>
            row?.fragrance_ratio
        )
      );

    if(
      supplierZh.length!==1||
      supplierEn.length!==1||
      supplierKo.length>1||
      ratios.length!==1
    ){
      fail(
        seriesId+
        ' scents do not share one series-level supplier/ratio standard.'
      );
      continue;
    }

    if(
      standard.supplier.zh!==
        supplierZh[0]||
      standard.supplier.en!==
        supplierEn[0]||
      standard.supplier.ko!==
        (
          supplierKo[0]||
          ''
        )||
      standard.fragranceRatio!==
        ratios[0]
    ){
      fail(
        seriesId+
        ' scent standard does not match data/scents.csv.'
      );
    }

    if(
      standard.helperCopy.status===
        'approved'&&
      SUPPORTED_LOCALES.some(
        locale=>
          !standard.helperCopy
            .copy[locale]
      )
    ){
      fail(
        seriesId+
        ' approved Scent helper copy must contain zh/en/ko.'
      );
    }
  }

  const holidayOptions=
    seriesDocument
      ?.series
      ?.holiday
      ?.scentSeriesOptions||
    [];

  if(
    JSON.stringify(
      [...holidayOptions].sort()
    )!==
    JSON.stringify([
      'advanced',
      'classic',
      'masterpiece'
    ])
  ){
    fail(
      'Holiday must resolve Scent Standard from classic/advanced/masterpiece.'
    );
  }

  const rule=
    quantityRule(
      document
    );

  if(
    rule.ruleId!==
      'same-series-same-size-mixed-product-moq'
  ){
    fail(
      'Quantity helper ruleId changed.'
    );
  }

  if(
    JSON.stringify(
      rule.aggregationKey
    )!==
    JSON.stringify([
      'series',
      'size'
    ])
  ){
    fail(
      'Quantity aggregationKey must be [series,size].'
    );
  }

  if(
    !rule.allowMixedProducts||
    rule.allowCrossSize
  ){
    fail(
      'Quantity rule must allow mixed products within one series+size and forbid cross-size aggregation.'
    );
  }

  if(
    rule.helperCopy.status===
      'approved'&&
    SUPPORTED_LOCALES.some(
      locale=>
        !rule.helperCopy
          .copy[locale]
    )
  ){
    fail(
      'Approved Quantity helper copy must contain zh/en/ko.'
    );
  }

  return Object.freeze(
    errors
  );
}

export {
  SUPPORTED_LOCALES,
  COPY_STATUSES,
  COLOR_STORY_KINDS,
  copyBlock
};
