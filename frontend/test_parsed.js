const assert = require('assert');

let cleaned = "The Health Factory Zero Maida Protein Bread250 g";
const qtyMatch = cleaned.match(/\d+(?:\.\d+)?\s*(?:kg|g|gm|grams?|ml|l|ltr|litre|litres|pcs?|pc|pack|pouch|bottle)$/i);
if (qtyMatch) {
  cleaned = cleaned.replace(new RegExp(qtyMatch[0] + '$', 'i'), '').trim();
}
console.log(cleaned);
