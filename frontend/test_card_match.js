const html = `
<div class="product-card">
  <img src="https://www.bbassets.com/bb2assets/images/webp/transparentImg.webp" />
  <picture>
     <source srcset="https://www.bbassets.com/product/image1.jpg" />
  </picture>
</div>
`;

function extractImage(searchHTML) {
  let image = '';
  const tokens = searchHTML.split(/["']/);
  for (const t of tokens) {
     const cleanT = t.trim();
     if ((cleanT.includes('bbassets.com') || cleanT.includes('bigbasket.com')) && 
         !cleanT.includes('transparentImg') && 
         !cleanT.includes('.svg') &&
         cleanT.length > 15 && 
         cleanT.length < 400 &&
         (cleanT.startsWith('http') || cleanT.startsWith('//') || cleanT.startsWith('/'))) {
        image = cleanT;
        break;
     }
  }
  return image;
}

console.log('Result:', extractImage(html));
