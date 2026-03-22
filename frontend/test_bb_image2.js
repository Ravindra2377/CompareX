const https = require('https');

function checkURL(url) {
  return new Promise((resolve) => {
    https.get(url, (res) => {
      resolve({ url, status: res.statusCode });
    }).on('error', () => {
      resolve({ url, status: 'error' });
    });
  });
}

async function run() {
  const ids = ['40026603', '1205356', '10000069']; // Nandini Milk, Onion, Tomato
  for (const id of ids) {
    const urls = [
      `https://www.bigbasket.com/media/uploads/p/m/${id}_1.jpg`,
      `https://www.bbassets.com/bb2assets/images/webp/${id}_1.webp` // Test webp format
    ];
    for (const u of urls) {
      const res = await checkURL(u);
      console.log(res);
    }
  }
}
run();
