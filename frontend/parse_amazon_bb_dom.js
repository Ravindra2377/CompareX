const fs = require('fs');

async function fetchMobileAmazon() {
  try {
    const res = await fetch('https://www.amazon.in/s?k=milk', {
      headers: {
        'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.6 Mobile/15E148 Safari/604.1',
        'Accept': 'text/html'
      }
    });
    const html = await res.text();
    fs.writeFileSync('amazon_mobile.html', html);
    console.log('Saved amazon_mobile.html, size:', html.length);
  } catch (e) {
    console.error(e);
  }
}

async function fetchMobileBigBasket() {
  try {
    const res = await fetch('https://www.bigbasket.com/ps/?q=milk', {
      headers: {
        'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.6 Mobile/15E148 Safari/604.1',
        'Accept': 'text/html'
      }
    });
    const html = await res.text();
    fs.writeFileSync('bb_mobile.html', html);
    console.log('Saved bb_mobile.html, size:', html.length);
  } catch(e) {
    console.error(e);
  }
}

fetchMobileAmazon();
fetchMobileBigBasket();
