import {
access,
mkdir,
readFile,
readdir,
rm,
writeFile
} from 'node:fs/promises';

import path from 'node:path';
import { spawnSync } from 'node:child_process';

const ROOT = process.cwd();
const errors = [];
const warnings = [];

function addError(message) {
errors.push(message);
}

function addWarning(message) {
warnings.push(message);
}

function relative(filePath) {
return path
.relative(ROOT, filePath)
.replaceAll('\', '/');
}

async function fileExists(relativePath) {
try {
await access(
path.join(ROOT, relativePath)
);
return true;
} catch {
return false;
}
}

async function readJson(relativePath) {
try {
const content = await readFile(
path.join(ROOT, relativePath),
'utf8'
);

```
return JSON.parse(content);
```

} catch (error) {
addError(
relativePath +
': invalid or unreadable JSON (' +
error.message +
')'
);

```
return null;
```

}
}

async function collectJavaScriptFiles(
directory
) {
const results = [];

const entries = await readdir(
directory,
{
withFileTypes: true
}
);

for (const entry of entries) {
if (
entry.name === '.git' ||
entry.name === 'node_modules' ||
entry.name === '.quality-check-temp'
) {
continue;
}

```
const fullPath = path.join(
  directory,
  entry.name
);

if (entry.isDirectory()) {
  const nested =
    await collectJavaScriptFiles(
      fullPath
    );

  results.push(...nested);
} else if (
  /\.(?:js|mjs)$/i.test(
    entry.name
  )
) {
  results.push(fullPath);
}
```

}

return results;
}

function checkJavaScriptFile(filePath) {
const result = spawnSync(
process.execPath,
['--check', filePath],
{
encoding: 'utf8'
}
);

if (result.status !== 0) {
addError(
relative(filePath) +
': JavaScript syntax error\n' +
result.stderr.trim()
);
}
}

async function checkInlineScripts(
relativePath,
tempDirectory
) {
const fullPath = path.join(
ROOT,
relativePath
);

const html = await readFile(
fullPath,
'utf8'
);

const scriptPattern =
/<script(?![^>]*\bsrc\s*=)[^>]*>([\s\S]*?)</script>/gi;

let match;
let index = 0;

while (
(match =
scriptPattern.exec(html)) !== null
) {
const script =
match[1].trim();

```
if (!script) {
  continue;
}

index += 1;

const tempFile = path.join(
  tempDirectory,
  path.basename(relativePath) +
    '-' +
    index +
    '.mjs'
);

await writeFile(
  tempFile,
  script,
  'utf8'
);

checkJavaScriptFile(tempFile);
```

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
if (!(await fileExists(file))) {
addError(
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
readJson('data/products.json'),
readJson('data/series.json'),
readJson('data/i18n.json'),
readJson('data/app-config.json'),
readJson('manifest.webmanifest')
]);

const supportedLanguages = [
'zh',
'en',
'ko'
];

if (productsDoc) {
if (
!Array.isArray(
productsDoc.products
)
) {
addError(
'data/products.json: products must be an array'
);
} else {
const ids = new Set();

```
const knownSeries =
  new Set(
    Object.keys(
      seriesDoc?.series || {}
    )
  );

const knownSizes =
  new Set(
    Object.keys(
      seriesDoc?.sizes || {}
    )
  );

for (
  const [index, product] of
  productsDoc.products.entries()
) {
  const label =
    'data/products.json products[' +
    index +
    ']';

  const id = String(
    product?.id || ''
  ).trim();

  if (!id) {
    addError(
      label + ': id is required'
    );
  } else if (ids.has(id)) {
    addError(
      label +
        ': duplicate id "' +
        id +
        '"'
    );
  } else {
    ids.add(id);
  }

  if (
    !knownSeries.has(
      product?.series
    )
  ) {
    addError(
      label +
        ': unknown series "' +
        product?.series +
        '"'
    );
  }

  if (
    !knownSizes.has(
      product?.size
    )
  ) {
    addError(
      label +
        ': unknown size "' +
        product?.size +
        '"'
    );
  }

  for (
    const language of
    supportedLanguages
  ) {
    if (
      !String(
        product?.names?.[
          language
        ] || ''
      ).trim()
    ) {
      addError(
        label +
          ': missing names.' +
          language
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
      addError(
        label +
          ': missing descriptions.' +
          language
      );
    }
  }

  if (
    product?.cover &&
    typeof product.cover !==
      'string'
  ) {
    addError(
      label +
        ': cover must be a string'
    );
  }

  if (
    product?.images &&
    !Array.isArray(
      product.images
    )
  ) {
    addError(
      label +
        ': images must be an array'
    );
  }
}

const placeholderCount =
  productsDoc.products.filter(
    (product) =>
      product?.status ===
      'placeholder'
  ).length;

if (placeholderCount > 0) {
  addWarning(
    placeholderCount +
      ' products are still marked as placeholder'
  );
}
```

}
}

if (seriesDoc) {
const seriesMap =
seriesDoc.series || {};

if (
!Array.isArray(
seriesDoc.seriesOrder
)
) {
addError(
'data/series.json: seriesOrder must be an array'
);
} else {
for (
const seriesId of
seriesDoc.seriesOrder
) {
if (!seriesMap[seriesId]) {
addError(
'data/series.json: seriesOrder references unknown series "' +
seriesId +
'"'
);
}
}
}

if (
!seriesMap[
seriesDoc.defaultSeries
]
) {
addError(
'data/series.json: defaultSeries does not exist in series'
);
}

for (
const [seriesId, series] of
Object.entries(seriesMap)
) {
for (
const language of
supportedLanguages
) {
if (
!String(
series?.labels?.[
language
] || ''
).trim()
) {
addError(
'data/series.json series.' +
seriesId +
': missing labels.' +
language
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
addError(
'data/i18n.json: languages must be an array'
);
}

for (
const language of
supportedLanguages
) {
if (
!i18nDoc.languages?.includes(
language
)
) {
addError(
'data/i18n.json: missing language "' +
language +
'"'
);
}

```
if (
  !i18nDoc.currencyMap?.[
    language
  ]
) {
  addError(
    'data/i18n.json: missing currencyMap.' +
      language
  );
}

if (
  !i18nDoc.ui?.[language]
) {
  addError(
    'data/i18n.json: missing ui.' +
      language
  );
}
```

}
}

if (configDoc) {
if (
!String(
configDoc.submissionEndpoint ||
''
).trim()
) {
addError(
'data/app-config.json: submissionEndpoint is required'
);
}

if (
configDoc.web3formsEndpoint &&
configDoc.submissionEndpoint &&
configDoc.web3formsEndpoint !==
configDoc.submissionEndpoint
) {
addError(
'data/app-config.json: web3formsEndpoint and submissionEndpoint do not match'
);
}

if (configDoc.privacyUrl) {
const privacyPath =
String(
configDoc.privacyUrl
).replace(/^./+/, '');

```
if (
  !(await fileExists(
    privacyPath
  ))
) {
  addError(
    'data/app-config.json: privacyUrl target "' +
      privacyPath +
      '" is missing'
  );
}
```

}
}

if (manifestDoc) {
if (
!Array.isArray(
manifestDoc.icons
) ||
manifestDoc.icons.length === 0
) {
addError(
'manifest.webmanifest: at least one icon is required'
);
} else {
for (
const icon of
manifestDoc.icons
) {
const iconPath =
String(
icon?.src || ''
).replace(/^./+/, '');

```
  if (
    !iconPath ||
    !(await fileExists(
      iconPath
    ))
  ) {
    addError(
      'manifest.webmanifest: icon target "' +
        iconPath +
        '" is missing'
    );
  }
}
```

}
}

if (await fileExists('sw.js')) {
const serviceWorker =
await readFile(
path.join(ROOT, 'sw.js'),
'utf8'
);

const shellMatch =
serviceWorker.match(
/const\s+APP_SHELL\s*=\s*[([\s\S]*?)];/
);

if (!shellMatch) {
addError(
'sw.js: APP_SHELL array could not be found'
);
} else {
const shellPaths = [
...shellMatch[1].matchAll(
/['"](./[^'%22]+)['"]/g
)
]
.map((match) =>
match[1].replace(
/^./+/,
''
)
)
.filter(Boolean);

```
for (
  const shellPath of
  shellPaths
) {
  if (
    !(await fileExists(
      shellPath
    ))
  ) {
    addError(
      'sw.js: APP_SHELL target "' +
        shellPath +
        '" is missing'
    );
  }
}
```

}
}

const tempDirectory = path.join(
ROOT,
'.quality-check-temp'
);

await mkdir(
tempDirectory,
{
recursive: true
}
);

try {
const javaScriptFiles =
await collectJavaScriptFiles(
ROOT
);

for (
const file of
javaScriptFiles
) {
checkJavaScriptFile(file);
}

for (
const htmlFile of [
'index.html',
'offline.html',
'privacy.html'
]
) {
if (
await fileExists(htmlFile)
) {
await checkInlineScripts(
htmlFile,
tempDirectory
);
}
}
} finally {
await rm(
tempDirectory,
{
recursive: true,
force: true
}
);
}

for (const warning of warnings) {
console.warn(
'WARNING: ' + warning
);
}

if (errors.length > 0) {
console.error(
'\nProject validation failed:\n'
);

for (const error of errors) {
console.error(
'- ' + error
);
}

process.exit(1);
}

console.log(
'Project validation passed with ' +
warnings.length +
' warning(s).'
);
