import {
  access,
  mkdtemp,
  readFile,
  readdir,
  rm,
  writeFile
} from 'node:fs/promises';

import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const ROOT = process.cwd();
const errors = [];
const warnings = [];
const LANGUAGES = ['zh', 'en', 'ko'];
const VALID_STATUSES = new Set(['active', 'hidden', 'placeholder']);
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
const CORE_IMAGE_FIELDS = [
  'cover_image',
  'angle_image',
  'detail_image',
  'size_s_image',
  'size_m_image',
  'size_l_image',
  'size_xl_image'
];
const FORBIDDEN_TIER_TERMS = [
  '中端款',
  '低端款',
  '高端款',
  '基础款',
  '圣诞款'
];

function fail(message) {
  errors.push(message);
}

function warn(message) {
  warnings.push(message);
}

function normalizePath(value) {
  return String(value || '')
    .trim()
    .replace(/^\.\//, '')
    .replaceAll('\\', '/');
}

function toProjectPath(filePath) {
  return path.relative(ROOT, filePath).split(path.sep).join('/');
}

async function exists(relativePath) {
  if (!relativePath) return false;

  try {
    await access(path.join(ROOT, normalizePath(relativePath)));
    return true;
  } catch {
    return false;
  }
}

async function loadText(relativePath) {
  try {
    return await readFile(path.join(ROOT, relativePath), 'utf8');
  } catch (error) {
    fail(`${relativePath}: ${error.message}`);
    return '';
  }
}

async function loadJson(relativePath) {
  const content = await loadText(relativePath);
  if (!content) return null;

  try {
    return JSON.parse(content);
  } catch (error) {
    fail(`${relativePath}: invalid JSON: ${error.message}`);
    return null;
  }
}

function parseCsv(source, label) {
  const text = String(source || '').replace(/^\uFEFF/, '');
  const rows = [];
  let row = [];
  let field = '';
  let quoted = false;

  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];

    if (quoted) {
      if (char === '"') {
        if (text[index + 1] === '"') {
          field += '"';
          index += 1;
        } else {
          quoted = false;
        }
      } else {
        field += char;
      }
      continue;
    }

    if (char === '"') {
      quoted = true;
      continue;
    }

    if (char === ',') {
      row.push(field);
      field = '';
      continue;
    }

    if (char === '\n') {
      row.push(field);
      field = '';

      if (row.some(value => String(value).trim() !== '')) {
        rows.push(row);
      }

      row = [];
      continue;
    }

    if (char !== '\r') {
      field += char;
    }
  }

  if (quoted) {
    fail(`${label}: CSV contains an unclosed quote`);
  }

  if (field || row.length) {
    row.push(field);
    if (row.some(value => String(value).trim() !== '')) {
      rows.push(row);
    }
  }

  if (!rows.length) {
    fail(`${label}: CSV is empty`);
    return [];
  }

  const headers = rows[0].map(value => String(value).trim());

  return rows.slice(1).map((values, rowIndex) => {
    if (values.length !== headers.length) {
      fail(
        `${label}: row ${rowIndex + 2} has ${values.length} columns; expected ${headers.length}`
      );
    }

    return Object.fromEntries(
      headers.map((header, columnIndex) => [
        header,
        String(values[columnIndex] ?? '').trim()
      ])
    );
  });
}

function checkScriptSyntax(filePath, sourceOverride = null) {
  let targetPath = filePath;

  if (sourceOverride !== null) {
    targetPath = sourceOverride;
  }

  const result = spawnSync(
    process.execPath,
    ['--check', targetPath],
    { encoding: 'utf8' }
  );

  if (result.status !== 0) {
    fail(
      `${toProjectPath(filePath)}: JavaScript syntax error\n${result.stderr.trim()}`
    );
  }
}

async function collectScriptFiles(directory) {
  const files = [];
  const entries = await readdir(directory, { withFileTypes: true });

  for (const entry of entries) {
    if (entry.name === '.git' || entry.name === 'node_modules') continue;

    const fullPath = path.join(directory, entry.name);

    if (entry.isDirectory()) {
      files.push(...await collectScriptFiles(fullPath));
      continue;
    }

    if (entry.name.endsWith('.js') || entry.name.endsWith('.mjs')) {
      files.push(fullPath);
    }
  }

  return files;
}

async function validateInlineScripts() {
  const html = await loadText('index.html');
  if (!html) return;

  const scriptPattern = /<script\b([^>]*)>([\s\S]*?)<\/script>/gi;
  const tempDirectory = await mkdtemp(
    path.join(os.tmpdir(), 'dreamland-inline-js-')
  );

  let match;
  let inlineIndex = 0;

  try {
    while ((match = scriptPattern.exec(html))) {
      const attributes = match[1] || '';
      const source = match[2] || '';

      if (/\bsrc\s*=/.test(attributes) || !source.trim()) {
        continue;
      }

      inlineIndex += 1;
      const tempFile = path.join(tempDirectory, `inline-${inlineIndex}.js`);
      await writeFile(tempFile, source, 'utf8');

      const result = spawnSync(
        process.execPath,
        ['--check', tempFile],
        { encoding: 'utf8' }
      );

      if (result.status !== 0) {
        fail(
          `index.html: inline script ${inlineIndex} has a JavaScript syntax error\n${result.stderr.trim()}`
        );
      }
    }
  } finally {
    await rm(tempDirectory, { recursive: true, force: true });
  }
}

const requiredFiles = [
  'index.html',
  'offline.html',
  'privacy.html',
  'manifest.webmanifest',
  'sw.js',
  'catalog-data.js',
  'image-manager.js',
  'functions/api/submit.js',
  'data/products.csv',
  'data/products.json',
  'data/shared-assets.csv',
  'data/scents.csv',
  'data/series.json',
  'data/i18n.json',
  'data/app-config.json'
];

for (const file of requiredFiles) {
  if (!(await exists(file))) {
    fail(`${file}: required file is missing`);
  }
}

const [
  productsCsvText,
  productsJson,
  sharedAssetsCsvText,
  scentsCsvText,
  seriesDoc,
  i18nDoc,
  configDoc,
  manifestDoc,
  serviceWorkerText
] = await Promise.all([
  loadText('data/products.csv'),
  loadJson('data/products.json'),
  loadText('data/shared-assets.csv'),
  loadText('data/scents.csv'),
  loadJson('data/series.json'),
  loadJson('data/i18n.json'),
  loadJson('data/app-config.json'),
  loadJson('manifest.webmanifest'),
  loadText('sw.js')
]);

const products = parseCsv(productsCsvText, 'data/products.csv');
const sharedAssets = parseCsv(
  sharedAssetsCsvText,
  'data/shared-assets.csv'
);
const scents = parseCsv(scentsCsvText, 'data/scents.csv');

const seriesMap = seriesDoc?.series || {};
const sizeMap = seriesDoc?.sizes || {};

if (seriesDoc) {
  if (!Array.isArray(seriesDoc.seriesOrder)) {
    fail('data/series.json: seriesOrder must be an array');
  } else {
    for (const seriesId of seriesDoc.seriesOrder) {
      if (!seriesMap[seriesId]) {
        fail(
          `data/series.json: unknown series in seriesOrder: ${seriesId}`
        );
      }
    }
  }

  if (!seriesMap[seriesDoc.defaultSeries]) {
    fail(
      'data/series.json: defaultSeries must exist in series'
    );
  }

  for (const [seriesId, series] of Object.entries(seriesMap)) {
    for (const language of LANGUAGES) {
      if (!String(series?.labels?.[language] || '').trim()) {
        fail(
          `data/series.json: series.${seriesId}.labels.${language} is missing`
        );
      }
    }
  }
}

const productIds = new Set();
const activeProducts = [];
const statusCounts = new Map();

for (const [index, product] of products.entries()) {
  const label = `data/products.csv: row ${index + 2}`;
  const id = product.product_id;
  const status = product.status.toLowerCase();

  if (!id) {
    fail(`${label}: product_id is required`);
  } else if (productIds.has(id)) {
    fail(`${label}: duplicated product_id: ${id}`);
  } else {
    productIds.add(id);
  }

  if (!VALID_STATUSES.has(status)) {
    fail(`${label}: invalid status: ${product.status}`);
  }

  statusCounts.set(status, (statusCounts.get(status) || 0) + 1);

  if (!seriesMap[product.series]) {
    fail(`${label}: unknown series: ${product.series}`);
  }

  if (!sizeMap[product.default_size]) {
    fail(`${label}: unknown default_size: ${product.default_size}`);
  }

  for (const field of [
    'name_zh',
    'name_en',
    'name_ko'
  ]) {
    if (!product[field]) {
      fail(`${label}: ${field} is required`);
    }
  }

  for (const field of [
    'name_zh',
    'short_desc_zh',
    'short_desc_en',
    'short_desc_ko',
    'tags_zh',
    'pdf_series_label'
  ]) {
    const value = product[field] || '';
    const matchedTerm = FORBIDDEN_TIER_TERMS.find(term =>
      value.includes(term)
    );

    if (matchedTerm) {
      fail(
        `${label}: ${field} still contains forbidden tier label "${matchedTerm}"`
      );
    }
  }

  if (status === 'active') {
    activeProducts.push(product);

    for (const field of [
      'short_desc_zh',
      'short_desc_en',
      'short_desc_ko',
      'detail_desc_zh',
      'detail_desc_en',
      'detail_desc_ko'
    ]) {
      if (!product[field]) {
        fail(`${label}: active product ${field} is required`);
      }
    }

    for (const field of CORE_IMAGE_FIELDS) {
      const imagePath = normalizePath(product[field]);

      if (!imagePath) {
        fail(`${label}: active product ${field} is required`);
      } else if (!(await exists(imagePath))) {
        fail(`${label}: missing active product image: ${imagePath}`);
      }
    }

    for (const field of IMAGE_FIELDS.filter(
      name => !CORE_IMAGE_FIELDS.includes(name)
    )) {
      const imagePath = normalizePath(product[field]);

      if (imagePath && !(await exists(imagePath))) {
        fail(`${label}: missing referenced image: ${imagePath}`);
      }
    }
  }
}

if (!activeProducts.length) {
  fail('data/products.csv: no active products found');
}

console.log(
  'Product status counts:',
  Object.fromEntries(statusCounts)
);

if (productsJson) {
  if (!Array.isArray(productsJson.products)) {
    fail('data/products.json: products must be an array');
  } else {
    const csvActiveIds = activeProducts
      .map(product => product.product_id)
      .sort();

    const jsonActiveIds = productsJson.products
      .map(product => String(product?.id || '').trim())
      .filter(Boolean)
      .sort();

    if (
      JSON.stringify(csvActiveIds) !==
      JSON.stringify(jsonActiveIds)
    ) {
      fail(
        'data/products.json: fallback product IDs do not match active products in products.csv'
      );
    }

    for (const [index, product] of productsJson.products.entries()) {
      const label = `data/products.json: products[${index}]`;

      if (product?.status !== 'active') {
        fail(`${label}: fallback JSON must only contain active products`);
      }

      for (const language of LANGUAGES) {
        if (!String(product?.names?.[language] || '').trim()) {
          fail(`${label}: names.${language} is missing`);
        }

        if (!String(product?.descriptions?.[language] || '').trim()) {
          fail(`${label}: descriptions.${language} is missing`);
        }
      }
    }
  }
}

const assetIds = new Set();
const missingSharedImages = [];
const missingSharedFallbacks = [];

for (const [index, asset] of sharedAssets.entries()) {
  const label = `data/shared-assets.csv: row ${index + 2}`;

  if (!asset.asset_id) {
    fail(`${label}: asset_id is required`);
  } else if (assetIds.has(asset.asset_id)) {
    fail(`${label}: duplicated asset_id: ${asset.asset_id}`);
  } else {
    assetIds.add(asset.asset_id);
  }

  if (asset.status !== 'active') continue;

  for (const language of LANGUAGES) {
    if (!asset[`label_${language}`]) {
      fail(`${label}: label_${language} is required`);
    }
  }

  const imagePath = normalizePath(asset.image_path);
  const fallbackPath = normalizePath(asset.fallback_path);

  if (!imagePath) {
    fail(`${label}: active asset image_path is required`);
  } else if (!(await exists(imagePath))) {
    if (asset.category === 'home') {
      fail(`${label}: home image is missing: ${imagePath}`);
    } else {
      missingSharedImages.push({
        assetId: asset.asset_id,
        category: asset.category,
        path: imagePath
      });
    }
  }

  if (fallbackPath && !(await exists(fallbackPath))) {
    missingSharedFallbacks.push({
      assetId: asset.asset_id,
      category: asset.category,
      path: fallbackPath
    });
  }
}

if (missingSharedImages.length) {
  const categoryCounts = missingSharedImages.reduce(
    (counts, item) => {
      counts[item.category] = (counts[item.category] || 0) + 1;
      return counts;
    },
    {}
  );

  warn(
    `shared assets pending: ${missingSharedImages.length} primary images are missing ` +
    JSON.stringify(categoryCounts)
  );
}

if (missingSharedFallbacks.length) {
  const categoryCounts = missingSharedFallbacks.reduce(
    (counts, item) => {
      counts[item.category] = (counts[item.category] || 0) + 1;
      return counts;
    },
    {}
  );

  warn(
    `shared assets pending: ${missingSharedFallbacks.length} fallback images are missing ` +
    JSON.stringify(categoryCounts)
  );
}

const scentIds = new Set();
const scentsMissingKorean = new Map();

for (const [index, scent] of scents.entries()) {
  const label = `data/scents.csv: row ${index + 2}`;

  if (!scent.scent_id) {
    fail(`${label}: scent_id is required`);
  } else if (scentIds.has(scent.scent_id)) {
    fail(`${label}: duplicated scent_id: ${scent.scent_id}`);
  } else {
    scentIds.add(scent.scent_id);
  }

  if (!seriesMap[scent.series]) {
    fail(`${label}: unknown series: ${scent.series}`);
  }

  if (scent.status === 'active') {
    for (const field of [
      'name_zh',
      'name_en',
      'top_zh',
      'top_en',
      'heart_zh',
      'heart_en',
      'base_zh',
      'base_en',
      'supplier_zh',
      'supplier_en'
    ]) {
      if (!scent[field]) {
        fail(`${label}: active scent ${field} is required`);
      }
    }

    const missingFields = [
      'name_ko',
      'top_ko',
      'heart_ko',
      'base_ko',
      'supplier_ko'
    ].filter(field => !scent[field]);

    if (missingFields.length) {
      scentsMissingKorean.set(scent.scent_id, missingFields);
    }
  }
}

if (scentsMissingKorean.size) {
  warn(
    `Korean scent localization is incomplete for ${scentsMissingKorean.size} active scents`
  );
}

if (i18nDoc) {
  if (!Array.isArray(i18nDoc.languages)) {
    fail('data/i18n.json: languages must be an array');
  }

  for (const language of LANGUAGES) {
    if (!i18nDoc.languages?.includes(language)) {
      fail(`data/i18n.json: language is missing: ${language}`);
    }

    if (!i18nDoc.currencyMap?.[language]) {
      fail(`data/i18n.json: currencyMap.${language} is missing`);
    }

    if (!i18nDoc.ui?.[language]) {
      fail(`data/i18n.json: ui.${language} is missing`);
    }
  }
}

if (configDoc) {
  if (!String(configDoc.submissionEndpoint || '').trim()) {
    fail('data/app-config.json: submissionEndpoint is required');
  }

  if (configDoc.privacyUrl) {
    const privacyPath = normalizePath(configDoc.privacyUrl);

    if (!(await exists(privacyPath))) {
      fail(
        `data/app-config.json: privacyUrl target is missing: ${privacyPath}`
      );
    }
  }
}

if (manifestDoc) {
  if (!Array.isArray(manifestDoc.icons) || !manifestDoc.icons.length) {
    fail(
      'manifest.webmanifest: icons must contain at least one item'
    );
  } else {
    for (const icon of manifestDoc.icons) {
      const iconPath = normalizePath(icon?.src);

      if (!iconPath || !(await exists(iconPath))) {
        fail(
          `manifest.webmanifest: icon target is missing: ${iconPath}`
        );
      }
    }
  }
}

const cacheVersionMatch = serviceWorkerText.match(
  /const\s+CACHE_VERSION\s*=\s*['"]([^'"]+)['"]/
);

if (!cacheVersionMatch) {
  fail('sw.js: CACHE_VERSION declaration is missing');
} else {
  console.log(`Service worker cache version: ${cacheVersionMatch[1]}`);
}

if (
  !serviceWorkerText.includes("'./data/scents.csv'") &&
  !serviceWorkerText.includes('"./data/scents.csv"')
) {
  warn('sw.js: APP_SHELL does not explicitly include ./data/scents.csv');
}

const scriptFiles = await collectScriptFiles(ROOT);

for (const file of scriptFiles) {
  checkScriptSyntax(file);
}

await validateInlineScripts();

for (const message of warnings) {
  console.warn(`WARNING: ${message}`);
}

if (errors.length) {
  console.error('\nProject validation failed:\n');

  for (const message of errors) {
    console.error(`- ${message}`);
  }

  process.exit(1);
}

console.log(
  `Project validation passed with ${warnings.length} warning(s).`
);
