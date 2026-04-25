export const buildPlatformSearchUrl = (platformName, query) => {
  const q = encodeURIComponent(String(query || "").trim());
  if (!q) return "";

  const name = String(platformName).toLowerCase();

  if (name.includes("blinkit")) return `https://blinkit.com/s/?q=${q}`;
  if (name.includes("zepto")) return `https://www.zepto.com/search?query=${q}`;
  if (name.includes("bigbasket")) return `https://www.bigbasket.com/ps/?q=${q}`;
  if (name.includes("amazon")) return `https://www.amazon.in/s?k=${q}`;
  if (name.includes("flipkart")) return `https://www.flipkart.com/search?q=${q}`;
  
  return "";
};
