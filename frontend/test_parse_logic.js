const fs = require('fs');
const jsdom = require('jsdom');
const { JSDOM } = jsdom;

function testAmazon() {
  const html = fs.readFileSync('amazon_mobile.html', 'utf8');
  const dom = new JSDOM(html);
  const document = dom.window.document;
  
  const cards = document.querySelectorAll('div.s-result-item, div[data-component-type="s-search-result"], div[data-asin]');
  let foundImages = 0;
  cards.forEach((card, i) => {
    let image = '';
    const allImgs = card.querySelectorAll('.s-image, img');
    for (let img of allImgs) {
      const dynamicImage = img.getAttribute('data-a-dynamic-image');
      if (dynamicImage) {
        try {
          const urls = Object.keys(JSON.parse(dynamicImage));
          if (urls.length > 0) image = urls[urls.length - 1];
        } catch(e) {}
      }
      
      if (!image) {
        const attrs = [img.getAttribute('srcset'), img.getAttribute('data-srcset'), img.getAttribute('src'), img.getAttribute('data-src')];
        for (let a of attrs) {
          if (!a) continue;
          const parts = a.split(',');
          for (let p of parts) {
             const url = p.trim().split(' ')[0];
             if (url && !url.startsWith('data:') && !url.includes('grey-pixel') && !url.includes('.svg') && !url.includes('sprite')) {
               image = url;
               break;
             }
          }
          if (image) break;
        }
      }
      if (image) break;
    }
    if (image) {
        console.log(`Amazon Card ${i} Image: ${image}`);
        foundImages++;
    }
  });
  console.log(`Found Amazon Images: ${foundImages}/${cards.length}`);
}

function testBB() {
  const html = fs.readFileSync('bb_mobile.html', 'utf8');
  const dom = new JSDOM(html);
  const document = dom.window.document;
  
  const cards = document.querySelectorAll('[data-test-id="product-pod"], .product-card, .SKUDeck___StyledDiv-sc-1e5d9gk-0, li[class*="Product"]');
  let foundImages = 0;
  cards.forEach((card, i) => {
    let image = '';
    const allImgs = card.querySelectorAll('img');
    for (const img of allImgs) {
      const attrs = [img.getAttribute('srcset'), img.getAttribute('data-srcset'), img.getAttribute('src'), img.getAttribute('data-src')];
      for (const a of attrs) {
        if (!a) continue;
        const parts = a.split(',');
        for (const p of parts) {
           const url = p.trim().split(' ')[0];
           if (url && !url.startsWith('data:') && !url.includes('transparentImg') && !url.includes('.svg')) {
             image = url;
             break;
           }
        }
        if (image) break;
      }
      if (image) break;
    }
    
    if (!image) {
      const noscript = card.querySelector('noscript');
      if (noscript) {
        const noscriptMatch = (noscript.textContent || '').match(/src=['"]([^'"]+)['"]/i);
        if (noscriptMatch && noscriptMatch[1] && !noscriptMatch[1].startsWith('data:')) {
          image = noscriptMatch[1];
        }
      }
    }
    
    if (!image) {
      const match = card.innerHTML.match(/https?:\/\/[^\s"']*(bbassets\.com|bigbasket\.com)[^\s"']*/);
      if (match && !match[0].includes('transparentImg') && !match[0].includes('.svg')) {
        image = match[0];
      }
    }
    
    if (image) {
        console.log(`BB Card ${i} Image: ${image}`);
        foundImages++;
    }
  });
  console.log(`Found BB Images: ${foundImages}/${cards.length}`);
}

// Ensure jsdom is installed in the test project or install it
try {
  testAmazon();
  testBB();
} catch (e) {
  console.error("Install jsdom to run: npm i jsdom");
}
