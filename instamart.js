const fetch = require("node-fetch");

async function run() {
  const res = await fetch("https://www.swiggy.com/dapi/instamart/search/v2", {
    method: "POST",
    headers: {
      "content-type": "application/json",
    },
    body: JSON.stringify({
      query: "kitkat",
      search_results_offset: "0",
    }),
  });

  const data = await res.json();
  console.log(data);
}

run();
