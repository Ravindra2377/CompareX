const fs = require('fs');
const jsdom = require('jsdom');
const { JSDOM } = jsdom;
const html = fs.readFileSync('bb_mobile.html', 'utf8');
const dom = new JSDOM(html);
const document = dom.window.document;

let productCards = document.querySelectorAll('[data-test-id="product-pod"], .product-card, .SKUDeck___StyledDiv-sc-1e5d9gk-0, li[class*="Product"]');
console.log("Cards found with primary selectors:", productCards.length);

if (productCards.length === 0) {
  // If no main card wrapper, the fallback is used
  const candidateLinks = Array.from(document.querySelectorAll('a[href*="/pd/"], a[href*="/product/"]'));
  productCards = candidateLinks;
  console.log("Fallback links:", productCards.length);
}

productCards.forEach((card, i) => {
  if (i > 3) return; // Print first 4
  let image = '';
  // Try to find image within the card
  const allImgs = card.querySelectorAll('img');
  console.log(`Card ${i} images length:`, allImgs.length);
  for (const img of allImgs) {
    const attrs = [img.getAttribute('srcset'), img.getAttribute('data-srcset'), img.getAttribute('src'), img.getAttribute('data-src')];
    console.log(`   Attrs for img:`, attrs);
  }
  
  // If no internal image, maybe it's an a tag and we need to go to its parent/grandparent?
  if (allImgs.length === 0) {
      // search parents
      let parent = card.parentElement;
      for (let j=0; j<4; j++) {
          if (parent) {
             const parentImgs = parent.querySelectorAll('img');
             console.log(`     Parent level ${j} images length:`, parentImgs.length);
             if (parentImgs.length > 0) {
                for (const img of parentImgs) {
                   console.log(`       Parent Img attrs:`, [img.getAttribute('srcset'), img.getAttribute('src')]);
                }
             }
             parent = parent.parentElement;
          }
      }
  }
});
