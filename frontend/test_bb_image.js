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
  // Try several variants of a known BB product ID: 40224151 (e.g. Milk)
  const id = '40026603'; // Nandini Milk
  const urls = [
    `https://www.bigbasket.com/media/uploads/p/m/${id}_1.jpg`,
    `https://www.bigbasket.com/media/uploads/p/l/${id}_1.jpg`,
    `https://www.bigbasket.com/media/uploads/p/s/${id}_1.jpg`,
    `https://www.bigbasket.com/media/uploads/p/mm/${id}_1.jpg`,
    `https://www.bbassets.com/media/uploads/p/m/${id}_1.jpg`,
    `https://www.bbassets.com/media/uploads/p/l/${id}_1.jpg`
  ];
  
  for (const u of urls) {
    const res = await checkURL(u);
    console.log(res);
  }
}
run();
