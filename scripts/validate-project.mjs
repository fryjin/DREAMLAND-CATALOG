import {
access,
readFile,
readdir
} from 'node:fs/promises';

import path from 'node:path';
import { spawnSync } from 'node:child_process';

const ROOT = process.cwd();
const errors = [];
const warnings = [];

function fail(message) {
errors.push(message);
}

function warn(message) {
warnings.push(message);
}

function toProjectPath(filePath) {
return path
.relative(ROOT, filePath)
.split(path.sep)
.join('/');
}

async function exists(relativePath) {
try {
await access(
path.join(ROOT, relativePath)
);

```
return true;
```

} catch {
return false;
}
}

async function loadJson(relativePath) {
try {
const content = await readFile(
path.join(ROOT, relativePath),
'utf8'
);


return JSON.parse(content);

} catch (error) {
fail(
relativePath +
': ' +
error.message
);


return null;


}
}

async function collectScriptFiles(
directory
) {
const files = [];

const entries = await readdir(
directory,
{
withFileTypes: true
}
);

for (const entry of entries) {
if (
entry.name === '.git' ||
entry.name === 'node_modules'
) {
continue;
}


const fullPath = path.join(
  directory,
  entry.name
);

if (entry.isDirectory()) {
  const nested =
    await collectScriptFiles(
      fullPath
    );

  files.push(...nested);
  continue;
}

if (
  entry.name.endsWith('.js') ||
  entry.name.endsWith('.mjs')
) {
  files.push(fullPath);
}


}

return files;
}

function checkScriptSyntax(filePath) {
const result = spawnSync(
process.execPath,
[
'--check',
filePath
],
{
encoding: 'utf8'
}
);

if (result.status !== 0) {
fail(
toProjectPath(filePath) +
': JavaScript syntax error\n' +
result.stderr.trim()
);
}
}

const requiredFiles = [
'index.html',
'offline.html',
'privacy.html',
'manifest.webmanifest',
'sw.js',
'functions/api/submit.js',
'data/products.json',
'data/series.json',
'data/i18n.json',
'data/app-config.json'
];

for (const file of requiredFiles) {
if (!(await exists(file))) {
fail(
file +
': required file is missing'
);
}
}

const [
productsDoc,
seriesDoc,
i18nDoc,
configDoc,
manifestDoc
] = await Promise.all([
loadJson(
'data/products.json'
),
loadJson(
'data/series.json'
),
loadJson(
'data/i18n.json'
),
loadJson(
'data/app-config.json'
),
loadJson(
'manifest.webmanifest'
)
]);

const languages = [
'zh',
'en',
'ko'
];

if (seriesDoc) {
const seriesMap =
seriesDoc.series || {};

const sizeMap =
seriesDoc.sizes || {};

if (
!Array.isArray(
seriesDoc.seriesOrder
)
) {
fail(
'data/series.json: seriesOrder must be an array'
);
} else {
for (
const seriesId of
seriesDoc.seriesOrder
) {
if (!seriesMap[seriesId]) {
fail(
'data/series.json: unknown series in seriesOrder: ' +
seriesId
);
}
}
}

if (
!seriesMap[
seriesDoc.defaultSeries
]
) {
fail(
'data/series.json: defaultSeries must exist in series'
);
}

for (
const [seriesId, series] of
Object.entries(seriesMap)
) {
for (
const language of languages
) {
if (
!String(
series?.labels?.[
language
] || ''
).trim()
) {
fail(
'data/series.json: series.' +
seriesId +
'.labels.' +
language +
' is missing'
);
}
}
}

if (productsDoc) {
if (
!Array.isArray(
productsDoc.products
)
) {
fail(
'data/products.json: products must be an array'
);
} else {
const ids = new Set();
let placeholderCount = 0;


  for (
    const [index, product] of
    productsDoc.products.entries()
  ) {
    const label =
      'data/products.json: products[' +
      index +
      ']';

    const id = String(
      product?.id || ''
    ).trim();

    if (!id) {
      fail(
        label +
          '.id is required'
      );
    } else if (ids.has(id)) {
      fail(
        label +
          '.id is duplicated: ' +
          id
      );
    } else {
      ids.add(id);
    }

    if (
      !seriesMap[
        product?.series
      ]
    ) {
      fail(
        label +
          '.series is unknown: ' +
          product?.series
      );
    }

    if (
      !sizeMap[
        product?.size
      ]
    ) {
      fail(
        label +
          '.size is unknown: ' +
          product?.size
      );
    }

    for (
      const language of
      languages
    ) {
      if (
        !String(
          product?.names?.[
            language
          ] || ''
        ).trim()
      ) {
        fail(
          label +
            '.names.' +
            language +
            ' is missing'
        );
      }

      if (
        !String(
          product
            ?.descriptions?.[
              language
            ] || ''
        ).trim()
      ) {
        fail(
          label +
            '.descriptions.' +
            language +
            ' is missing'
        );
      }
    }

    if (
      product?.images &&
      !Array.isArray(
        product.images
      )
    ) {
      fail(
        label +
          '.images must be an array'
      );
    }

    if (
      product?.status ===
      'placeholder'
    ) {
      placeholderCount += 1;
    }
  }

  if (
    placeholderCount > 0
  ) {
    warn(
      placeholderCount +
        ' products are still marked as placeholder'
    );
  }
}


}
}

if (i18nDoc) {
if (
!Array.isArray(
i18nDoc.languages
)
) {
fail(
'data/i18n.json: languages must be an array'
);
}

for (
const language of languages
) {
if (
!i18nDoc.languages?.includes(
language
)
) {
fail(
'data/i18n.json: language is missing: ' +
language
);
}


if (
  !i18nDoc.currencyMap?.[
    language
  ]
) {
  fail(
    'data/i18n.json: currencyMap.' +
      language +
      ' is missing'
  );
}

if (
  !i18nDoc.ui?.[
    language
  ]
) {
  fail(
    'data/i18n.json: ui.' +
      language +
      ' is missing'
  );
}


}
}

if (configDoc) {
if (
!String(
configDoc
.submissionEndpoint || ''
).trim()
) {
fail(
'data/app-config.json: submissionEndpoint is required'
);
}

if (
configDoc.web3formsEndpoint &&
configDoc.submissionEndpoint &&
configDoc.web3formsEndpoint !==
configDoc.submissionEndpoint
) {
fail(
'data/app-config.json: web3formsEndpoint and submissionEndpoint must match'
);
}

if (configDoc.privacyUrl) {
const privacyPath =
String(
configDoc.privacyUrl
).replace(
'./',
''
);


if (
  !(await exists(
    privacyPath
  ))
) {
  fail(
    'data/app-config.json: privacyUrl target is missing: ' +
      privacyPath
  );
}


}
}

if (manifestDoc) {
if (
!Array.isArray(
manifestDoc.icons
) ||
manifestDoc.icons.length === 0
) {
fail(
'manifest.webmanifest: icons must contain at least one item'
);
} else {
for (
const icon of
manifestDoc.icons
) {
const iconPath =
String(
icon?.src || ''
).replace(
'./',
''
);


  if (
    !iconPath ||
    !(await exists(
      iconPath
    ))
  ) {
    fail(
      'manifest.webmanifest: icon target is missing: ' +
        iconPath
    );
  }
}


}
}

const scriptFiles =
await collectScriptFiles(
ROOT
);

for (const file of scriptFiles) {
checkScriptSyntax(file);
}

for (
const message of warnings
) {
console.warn(
'WARNING: ' + message
);
}

if (errors.length > 0) {
console.error(
'\nProject validation failed:\n'
);

for (
const message of errors
) {
console.error(
'- ' + message
);
}

process.exit(1);
}

console.log(
'Project validation passed with ' +
warnings.length +
' warning(s).'
);
