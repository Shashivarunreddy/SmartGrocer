const d = require('../../products.json');
const zeroItems = d.products.filter((p) => !p.price || p.price === 0);
console.log('Total zero-price items:', zeroItems.length);
zeroItems.slice(0, 25).forEach((p, i) => {
  console.log(`${i + 1}. [${p.brands}] ${p.product_name} (${p.quantity || ''}) [code: ${p.code}]`);
});
