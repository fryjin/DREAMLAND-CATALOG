const text=value=>
  String(value??'').trim();

const webPath=value=>{
  const source=text(value);

  if(!source){
    return '';
  }

  if(
    source.startsWith('/')||
    source.startsWith('http://')||
    source.startsWith('https://')
  ){
    return source;
  }

  return '/'+
    source.replace(
      /^\.\//,
      ''
    );
};

const previewPath=image=>{
  const source=webPath(image);

  if(
    !source.startsWith(
      '/images/shared/'
    )
  ){
    return '';
  }

  return source
    .replace(
      '/images/shared/',
      '/images/generated/shared/'
    )
    .replace(
      /\/cover\.(?:webp|png|jpe?g)$/i,
      '/cover-960.webp'
    );
};

const freezeOption=row=>
  Object.freeze({
    id:text(row?.asset_id),
    category:text(row?.category),
    value:text(row?.lookup_key),
    size:text(row?.size).toUpperCase(),
    labels:Object.freeze({
      zh:text(row?.label_zh),
      en:text(row?.label_en),
      ko:text(row?.label_ko)
    }),
    image:webPath(row?.image_path),
    preview:
      previewPath(
        row?.image_path
      ),
    fallback:webPath(
      row?.fallback_path
    ),
    sortOrder:
      Number(row?.sort_order)||
      9999
  });

function activeRows(
  rows,
  category
){
  return (
    Array.isArray(rows)
      ? rows
      : []
  )
    .filter(
      row=>
        text(row?.status)
          .toLowerCase()===
          'active'&&
        text(row?.category)===
          category
    )
    .map(freezeOption)
    .sort(
      (a,b)=>
        a.sortOrder-
        b.sortOrder
    );
}

function uniqueIndex(
  rows,
  keyOf,
  label
){
  const index=
    new Map();

  for(const row of rows){
    const key=keyOf(row);

    if(!key){
      throw new Error(
        'PDP visual option asset is missing '+label+'.'
      );
    }

    if(index.has(key)){
      throw new Error(
        'Duplicate PDP visual option '+label+': '+
        key
      );
    }

    index.set(
      key,
      row
    );
  }

  return index;
}

function patternContract(
  patternRows,
  seriesDocument
){
  const byLookup=
    uniqueIndex(
      patternRows,
      row=>row.value,
      'pattern lookup_key'
    );

  const canonical=
    seriesDocument
      ?.patternsBySize||
    {};

  return Object.freeze(
    Object.fromEntries(
      Object.entries(canonical)
        .map(
          ([size,values])=>{
            const normalizedSize=
              text(size)
                .toUpperCase();

            const options=
              (
                Array.isArray(values)
                  ? values
                  : []
              )
                .map(value=>{
                  const key=text(value);
                  const asset=byLookup.get(key);

                  if(!asset){
                    throw new Error(
                      'Missing active visual asset for pattern: '+
                      normalizedSize+
                      ' / '+
                      key
                    );
                  }

                  if(
                    asset.size!==
                    normalizedSize
                  ){
                    throw new Error(
                      'Pattern visual asset size mismatch: '+
                      key+
                      ' expected '+
                      normalizedSize+
                      ', received '+
                      asset.size
                    );
                  }

                  return asset;
                });

            return [
              normalizedSize,
              Object.freeze(options)
            ];
          }
        )
    )
  );
}

function packageContract(
  packageRows,
  seriesDocument
){
  const byLookup=
    uniqueIndex(
      packageRows,
      row=>row.value,
      'package lookup_key'
    );

  const canonicalSeries=
    seriesDocument
      ?.series||
    {};

  return Object.freeze(
    Object.fromEntries(
      Object.entries(canonicalSeries)
        .map(
          ([seriesId,series])=>{
            const values=
              series
                ?.packaging
                ?.options||
              [];

            const options=
              (
                Array.isArray(values)
                  ? values
                  : []
              )
                .map(value=>{
                  const key=text(value);
                  const asset=byLookup.get(key);

                  if(!asset){
                    throw new Error(
                      'Missing active visual asset for packaging: '+
                      seriesId+
                      ' / '+
                      key
                    );
                  }

                  return asset;
                });

            return [
              text(seriesId),
              Object.freeze(options)
            ];
          }
        )
    )
  );
}

export const PDP_VISUAL_OPTIONS_VERSION=1;

export function buildPdpVisualOptions({
  sharedAssets=[],
  seriesDocument={}
}={}){
  const patterns=
    activeRows(
      sharedAssets,
      'pattern'
    );

  const packages=
    activeRows(
      sharedAssets,
      'package'
    );

  return Object.freeze({
    version:
      PDP_VISUAL_OPTIONS_VERSION,
    patternsBySize:
      patternContract(
        patterns,
        seriesDocument
      ),
    packagesBySeries:
      packageContract(
        packages,
        seriesDocument
      ),
    assets:Object.freeze({
      patterns:Object.freeze(
        patterns
      ),
      packages:Object.freeze(
        packages
      )
    })
  });
}
