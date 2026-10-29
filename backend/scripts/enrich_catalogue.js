const fs = require('fs');
const path = require('path');
const zlib = require('zlib');
const readline = require('readline');

const PRODUCTS_JSON_PATH = path.resolve(__dirname, '../../products.json');
const CSV_GZ_PATH = 'C:\\Users\\shash\\Downloads\\en.openfoodfacts.org.products.csv.gz';

if (!fs.existsSync(PRODUCTS_JSON_PATH)) {
  console.error('products.json not found at', PRODUCTS_JSON_PATH);
  process.exit(1);
}

if (!fs.existsSync(CSV_GZ_PATH)) {
  console.error('OFF csv.gz not found at', CSV_GZ_PATH);
  process.exit(1);
}

const existingData = JSON.parse(fs.readFileSync(PRODUCTS_JSON_PATH, 'utf-8'));
const existingProducts = existingData.products || [];
const existingCodes = new Set(existingProducts.map((p) => String(p.code).trim()));

console.log(`Starting with ${existingProducts.length} existing products in products.json.`);
const TARGET_TOTAL = 525; // 500+ items as requested
const NEEDED = TARGET_TOTAL - existingProducts.length;
console.log(`Targeting ${TARGET_TOTAL} products (collecting ${NEEDED} verified UK products)...`);

const UK_BRANDS_PATTERNS = [
  /\bsainsbury/i,
  /\bmarks\s*(&|and)?\s*spencer/i,
  /\bm&s\b/i,
  /\btesco\b/i,
  /\basda\b/i,
  /\bmorrisons?\b/i,
  /\bwaitrose\b/i,
  /\bco-?op\b/i,
  /\bthe\s+co-operative\b/i,
  /\bwalkers?\b/i,
  /\bcadbury\b/i,
  /\bwarburtons?\b/i,
  /\bkingsmill\b/i,
  /\bhovis\b/i,
  /\bweetabix\b/i,
  /\bmcvitie'?s?\b/i,
  /\bkipling\b/i,
  /\bheinz\b/i,
  /\bbirds\s*eye\b/i,
  /\bquorn\b/i,
  /\bbisto\b/i,
  /\bmarmite\b/i,
  /\bribena\b/i,
  /\byorkshire\s*tea\b/i,
  /\btwinings\b/i,
  /\bpg\s*tips\b/i,
  /\binnocent\b/i,
  /\brobinsons\b/i,
  /\byeo\s*valley\b/i,
  /\btiptree\b/i,
  /\bwilkin\s*(&|and)?\s*sons\b/i,
  /\balpro\b/i,
  /\bcathedral\s*city\b/i,
  /\blurpak\b/i,
  /\bbatchelors\b/i,
  /\bambrosia\b/i,
  /\browntrees?\b/i,
  /\bcolman'?s?\b/i,
  /\bbranston\b/i,
];

function parseQty(qtyStr, rawNumeric) {
  let unit = 'g';
  let qty = 1;

  if (qtyStr) {
    const unitMatch = qtyStr.match(/(kg|ml|cl|l|g|piece|slices|capsules|pack)/i);
    if (unitMatch) {
      unit = unitMatch[1].toLowerCase();
      if (unit === 'cl') unit = 'ml';
    } else if (/^\d+$/.test(qtyStr.trim())) {
      unit = 'piece';
    }
  }

  if (rawNumeric && !isNaN(Number(rawNumeric)) && Number(rawNumeric) > 0) {
    qty = Number(rawNumeric);
  } else if (qtyStr) {
    const numMatch = qtyStr.match(/([\d.,]+)/);
    if (numMatch) {
      const parsed = parseFloat(numMatch[1].replace(',', '.'));
      if (!isNaN(parsed) && parsed > 0) qty = parsed;
    }
  }

  return { qty, unit };
}

function cleanBrand(brandStr) {
  if (!brandStr) return 'UK Groceries';
  const parts = brandStr.split(',').map((s) => s.trim()).filter(Boolean);
  return parts[0] || brandStr;
}

const newProducts = [];
const brandCount = new Map();

const gunzip = zlib.createGunzip();
const fileStream = fs.createReadStream(CSV_GZ_PATH);
const rl = readline.createInterface({
  input: fileStream.pipe(gunzip),
  crlfDelay: Infinity,
});

let lineIndex = 0;
let isClosed = false;

rl.on('line', (line) => {
  if (isClosed) return;
  lineIndex++;
  if (lineIndex === 1) return; // Skip CSV header

  const cols = line.split('\t');
  if (cols.length < 84) return;

  const code = (cols[0] || '').trim();
  const name = (cols[10] || '').trim();
  const rawBrand = (cols[18] || '').trim();
  const catEn = (cols[23] || '').trim();
  const countryTags = (cols[40] || '').toLowerCase();
  const countryEn = (cols[41] || '').toLowerCase();
  const rawNumericQty = (cols[72] || '').trim();
  const img = (cols[82] || cols[83] || '').trim();
  const qtyStr = (cols[13] || '').trim();

  // 1. Barcode validity and uniqueness
  if (!code || existingCodes.has(code) || code.length < 6 || code.length > 20) return;

  // 2. Strict UK Geographical & Brand Verification
  const isUkCountry = countryTags.includes('united-kingdom') || countryEn.includes('united kingdom');
  const isUkBrand = UK_BRANDS_PATTERNS.some((p) => p.test(rawBrand));
  if (!isUkCountry || !isUkBrand) return;

  // 3. Name, brand, image, and category completeness
  if (!name || name.length < 3 || name.length > 80) return;
  if (/^test\b/i.test(name) || /^\d+$/.test(name)) return;
  if (!rawBrand || rawBrand.length < 2) return;
  if (!img || !img.startsWith('http')) return;
  if (!catEn || catEn.length < 3) return;

  const brand = cleanBrand(rawBrand);
  if (/trader\s*joe|aus der|sociedad|kraft|schwäbische/i.test(brand)) return;
  if (/trader\s*joe|aus der|schwäbische/i.test(name)) return;

  // Keep brand variety (max 15 items per single brand)
  const currentCountForBrand = brandCount.get(brand.toLowerCase()) || 0;
  if (currentCountForBrand >= 15) return;

  // Extract categories tags
  const tags = catEn
    .split(',')
    .map((c) => c.trim())
    .filter((c) => c.length > 0 && !c.toLowerCase().startsWith('en:') && c.toLowerCase() !== 'groceries');

  if (tags.length === 0) return;

  const { qty, unit } = parseQty(qtyStr, rawNumericQty);

  const product = {
    brands: brand,
    categories_tags_en: tags,
    code: code,
    image_url: img,
    product_name: name,
    product_quantity: qty,
    product_quantity_unit: unit,
    quantity: qtyStr || `${qty} ${unit}`,
    price: 0.0, // Requested: 0 for all newly added products
    currency: 'GBP',
  };

  newProducts.push(product);
  existingCodes.add(code);
  brandCount.set(brand.toLowerCase(), currentCountForBrand + 1);

  if (newProducts.length >= NEEDED) {
    isClosed = true;
    finish();
  }
});

rl.on('close', () => {
  if (!isClosed) {
    finish();
  }
});

function finish() {
  rl.close();
  fileStream.destroy();
  gunzip.destroy();

  console.log(`\nSuccessfully extracted ${newProducts.length} verified pure-UK products!`);
  const finalCatalog = [...existingProducts, ...newProducts];
  console.log(`Total catalogue size: ${finalCatalog.length} products.`);

  const output = {
    count: finalCatalog.length,
    page: 1,
    page_size: finalCatalog.length,
    products: finalCatalog,
  };

  fs.writeFileSync(PRODUCTS_JSON_PATH, JSON.stringify(output, null, 2), 'utf-8');
  console.log(`Updated ${PRODUCTS_JSON_PATH} successfully!`);

  // Brand summary
  const topBrands = [...brandCount.entries()].sort((a, b) => b[1] - a[1]);
  console.log('\nBreakdown of newly added UK brands:');
  topBrands.forEach(([b, c]) => console.log(` - ${b}: ${c} products`));

  process.exit(0);
}
