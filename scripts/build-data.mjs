#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { isDeepStrictEqual } from 'node:util';

const ROOT = process.cwd();
const SOURCE_PATH = path.join(ROOT, 'data', 'products.csv');
const OUTPUT_PATH = path.join(ROOT, 'data', 'products.json');

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

const REQUIRED_COLUMNS = [
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
];

const PRODUCT_NAME_OVERRIDES = {
  HOL001: 'C01',
  HOL002: 'C02'
};

function fail(message) {
  console.error(`[build-data] ${message}`);
  process.exitCode = 1;
}

function text(value) {
  return String(value ?? '').trim();
}

function number(value, fallback = 0) {
  const parsed = Number(text(value));
  return Number.isFinite(parsed) ? parsed : fallback;
}

function boolean(value) {
  return ['1', 'true', 'yes', 'y', '是']
    .includes(text(value).toLowerCase());
}

function splitList(value, separator = ',') {
  return text(value)
    .split(separator)
    .map(item => item.trim())
    .filter(Boolean);
}

function parseCsv(csvText) {
  const source = String(csvText || '').replace(/^\uFEFF/, '');
  const table = [];
  let row = [];
  let cell = '';
  let quoted = false;

  for (let index = 0; index < source.length; index += 1) {
    const char = source[index];
    const next = source[index + 1];

    if (char === '"') {
      if (quoted && next === '"') {
        cell += '"';
        index += 1;
      } else {
        quoted = !quoted;
      }
      continue;
    }

    if (char === ',' && !quoted) {
      row.push(cell);
      cell = '';
      continue;
    }

    if ((char === '\n' || char === '\r') && !quoted) {
      if (char === '\r' && next === '\n') index += 1;
      row.push(cell);
      cell = '';
      if (row.some(value => value !== '')) table.push(row);
      row = [];
      continue;
    }

    cell += char;
  }

  if (quoted) {
    throw new Error('Unclosed quoted CSV field.');
  }

  if (cell !== '' || row.length) {
    row.push(cell);
    if (row.some(value => value !== '')) table.push(row);
  }

  if (!table.length) return { headers: [], records: [] };

  const headers = table.shift().map(value => text(value));
  const records = table.map((values, rowIndex) => {
    if (values.length !== headers.length) {
      throw new Error(
        `CSV row ${rowIndex + 2} has ${values.length} columns; expected ${headers.length}.`
      );
    }

    const record = {};
    headers.forEach((header, index) => {
      record[header] = values[index] ?? '';
    });
    return record;
  });

  return { headers, records };
}

function validateSource(headers, rows) {
  const missing = REQUIRED_COLUMNS.filter(column => !headers.includes(column));
  if (missing.length) {
    throw new Error(
      `products.csv is missing required columns: ${missing.join(', ')}`
    );
  }

  const ids = new Set();

  rows.forEach((row, index) => {
    const id = text(row.product_id);

    if (!id) {
      throw new Error(`products.csv row ${index + 2} has no product_id.`);
    }

    if (ids.has(id)) {
      throw new Error(`Duplicate product_id in products.csv: ${id}`);
    }

    ids.add(id);
  });
}

function applyProductOverrides(product) {
  const displayName = PRODUCT_NAME_OVERRIDES[product.id];
  if (!displayName) return product;

  product.name = displayName;
  product.names = {
    ...(product.names || {}),
    zh: displayName,
    en: displayName,
    ko: displayName
  };

  return product;
}

function mapCsvProduct(row) {
  const id = text(row.product_id);
  const defaultSize = text(row.default_size) || 'S';

  const shortDescriptions = {
    zh: text(row.short_desc_zh),
    en: text(row.short_desc_en),
    ko: text(row.short_desc_ko)
  };

  const detailDescriptions = {
    zh: text(row.detail_desc_zh),
    en: text(row.detail_desc_en),
    ko: text(row.detail_desc_ko)
  };

  const product = {
    id,
    productId: id,
    series: text(row.series),
    status: text(row.status).toLowerCase() || 'hidden',
    sortOrder: number(row.sort_order),
    listSort: number(row.list_sort, number(row.sort_order)),
    name: text(row.name_zh) || id,
    names: {
      zh: text(row.name_zh) || id,
      en: text(row.name_en) || text(row.name_zh) || id,
      ko: text(row.name_ko) || text(row.name_zh) || id
    },
    desc: shortDescriptions.zh || detailDescriptions.zh,
    descriptions: {
      zh: shortDescriptions.zh || detailDescriptions.zh,
      en: shortDescriptions.en || detailDescriptions.en || shortDescriptions.zh,
      ko: shortDescriptions.ko || detailDescriptions.ko || shortDescriptions.zh
    },
    detailDescriptions,
    size: defaultSize,
    defaultSize,
    availableSizes: splitList(row.available_sizes),
    availablePatterns: text(row.available_patterns),
    availableScentSeries: splitList(row.available_scent_series),
    color: text(row.color_class) || 'color-1',
    tags: {
      zh: splitList(row.tags_zh),
      en: splitList(row.tags_en),
      ko: splitList(row.tags_ko)
    },
    featured: boolean(row.featured),
    launchDate: text(row.launch_date),
    updatedAt: text(row.updated_at),
    colorCode: text(row.color_code),
    pdfSeriesLabel: text(row.pdf_series_label),
    pdfSourcePage: number(row.pdf_source_page)
  };

  IMAGE_FIELDS.forEach(field => {
    product[field] = text(row[field]);
  });

  return applyProductOverrides(product);
}

function buildProducts(csvText) {
  const { headers, records } = parseCsv(csvText);
  validateSource(headers, records);

  const mapped = records.map(mapCsvProduct);

  // products.json is a browser fallback, not a complete authoring mirror.
  // Preserve the existing project contract: fallback JSON contains ACTIVE products only.
  const products = mapped.filter(product => product.status === 'active');

  if (!products.length) {
    throw new Error('No active products were generated for products.json.');
  }

  if (products.some(product => product.status !== 'active')) {
    throw new Error('Generated products.json contains a non-active product.');
  }

  return {
    schemaVersion: 1,
    products
  };
}

function readExistingJson() {
  if (!fs.existsSync(OUTPUT_PATH)) return null;

  try {
    return JSON.parse(fs.readFileSync(OUTPUT_PATH, 'utf8'));
  } catch (error) {
    throw new Error(`Cannot parse data/products.json: ${error.message}`);
  }
}

function changedProductIds(existing, generated) {
  const before = new Map(
    (existing?.products || []).map(product => [product.id, product])
  );
  const after = new Map(
    (generated?.products || []).map(product => [product.id, product])
  );
  const ids = new Set([...before.keys(), ...after.keys()]);

  return [...ids].filter(
    id => !isDeepStrictEqual(before.get(id), after.get(id))
  );
}

function usage() {
  console.log(`Usage:
  node scripts/build-data.mjs --check
  node scripts/build-data.mjs --write

--check  Verify data/products.json is exactly the active-only fallback
         derivable from data/products.csv.
--write  Regenerate the active-only fallback when semantic content differs.`);
}

const args = new Set(process.argv.slice(2));

if (args.has('--help') || args.has('-h')) {
  usage();
  process.exit(0);
}

const mode = args.has('--write') ? 'write' : 'check';

try {
  const csvText = fs.readFileSync(SOURCE_PATH, 'utf8');
  const generated = buildProducts(csvText);
  const existing = readExistingJson();

  if (existing && isDeepStrictEqual(existing, generated)) {
    console.log(
      `[build-data] OK: products.json is in sync with products.csv ` +
      `(${generated.products.length} active fallback products).`
    );
    process.exit(0);
  }

  const changedIds = changedProductIds(existing, generated);
  const summary = changedIds.length
    ? ` Changed products: ${changedIds.slice(0, 20).join(', ')}` +
      `${changedIds.length > 20 ? ` (+${changedIds.length - 20} more)` : ''}.`
    : '';

  if (mode === 'check') {
    fail(
      `data/products.json is not the active-only fallback generated from ` +
      `the current data/products.csv.${summary} ` +
      `Run "npm run data:build" or use the GitHub sync workflow.`
    );
  } else {
    fs.writeFileSync(
      OUTPUT_PATH,
      `${JSON.stringify(generated, null, 2)}\n`,
      'utf8'
    );

    console.log(
      `[build-data] Wrote active-only data/products.json from products.csv ` +
      `(${generated.products.length} products).${summary}`
    );
  }
} catch (error) {
  fail(error?.message || String(error));
}
