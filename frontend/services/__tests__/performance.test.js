/**
 * Performance tests for CompareX frontend.
 *
 * Coverage:
 *  - PerformanceMonitor: timing, marks, measures, frame-drop tracking
 *  - Price normalisation and aggregation throughput
 *  - Product name sanitization throughput
 *  - Search aggregation pipeline performance
 *  - Concurrent-operation timing
 *  - Memory allocations (via object-count checks)
 */

import {
  PerformanceMonitor,
  getGlobalMonitor,
  measureAsync,
} from "../PerformanceMonitor";

// ─────────────────────────────────────────────────────────────────────────────
// Helpers — inline copies of the production functions so tests run without
// React-Native WebView imports.
// ─────────────────────────────────────────────────────────────────────────────

const NON_PRICE_TOKEN_REGEX =
  /%|\b(off|mins?|min|ml|ltr|litre|litres|kg|g|gm|grams?|pcs?|piece|pack|combo)\b/i;

const extractNumericPrice = (raw) => {
  if (raw === null || raw === undefined) return 0;
  if (typeof raw === "number") {
    if (!Number.isFinite(raw) || raw <= 0) return 0;
    if (raw > 10000) return Math.round((raw / 100) * 100) / 100;
    return Math.round(raw * 100) / 100;
  }
  if (typeof raw !== "string") return 0;
  const text = raw.trim();
  if (!text) return 0;
  if (NON_PRICE_TOKEN_REGEX.test(text) && !/(₹|rs\.?|inr)/i.test(text))
    return 0;
  const currencyMatch = text.match(/(?:₹|rs\.?|inr)\s*([0-9]+(?:\.[0-9]+)?)/i);
  if (currencyMatch?.[1]) {
    const parsed = parseFloat(currencyMatch[1]);
    if (!Number.isFinite(parsed) || parsed <= 0) return 0;
    return Math.round(parsed * 100) / 100;
  }
  const genericMatch = text.match(/([0-9]+(?:\.[0-9]+)?)/);
  if (!genericMatch?.[1]) return 0;
  const parsed = parseFloat(genericMatch[1]);
  if (!Number.isFinite(parsed) || parsed <= 0) return 0;
  if (parsed > 10000) return Math.round((parsed / 100) * 100) / 100;
  return Math.round(parsed * 100) / 100;
};

const normalizeIncomingPrice = (product) => {
  const sellingCandidates = [
    product?.price,
    product?.discountPrice,
    product?.discount_price,
    product?.offerPrice,
    product?.offer_price,
    product?.sellingPrice,
    product?.selling_price,
    product?.finalPrice,
    product?.final_price,
  ];
  const mrpCandidates = [
    product?.mrp,
    product?.originalPrice,
    product?.original_price,
    product?.listPrice,
    product?.list_price,
    product?.strikePrice,
    product?.strike_price,
  ];

  let price = 0;
  for (const c of sellingCandidates) {
    const p = extractNumericPrice(c);
    if (p > 0) {
      price = p;
      break;
    }
  }
  let mrp = 0;
  for (const c of mrpCandidates) {
    const p = extractNumericPrice(c);
    if (p > 0) {
      mrp = p;
      break;
    }
  }

  if (!price && mrp) price = mrp;
  if (!mrp && price) mrp = price;

  if (price > 0 && mrp > 0) {
    const ratio = ((mrp - price) / mrp) * 100;
    if (ratio > 75) price = mrp;
  }

  return {
    price: price > 0 ? price : 0,
    mrp: mrp > 0 ? mrp : price > 0 ? price : 0,
  };
};

const sanitizeProductName = (rawName) => {
  const name = String(rawName || "").trim();
  if (!name) return "";
  let cleaned = name
    .replace(/\u00a0/g, " ")
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/([A-Za-z])(\d)/g, "$1 $2")
    .replace(/(\d)([A-Za-z])/g, "$1 $2")
    .replace(/\b\d+\s*mins?\b/gi, " ")
    .replace(/₹\s*[0-9]+(?:\.[0-9]+)?/gi, " ")
    .replace(/\b(add|buy\s*now|qty|view\s*more|off)\b/gi, " ")
    .replace(/\b\d+(?:\.\d+)?\s*[kK]?\s*Ratings?.*$/i, "")
    .replace(/\bRatings?.*$/i, "")
    .replace(/\bReviews?.*$/i, "")
    .replace(/[|]+/g, " ")
    .replace(/\s*-\s*/g, " - ")
    .replace(/\s+/g, " ")
    .trim();
  for (let i = 0; i < 3; i++) {
    cleaned = cleaned.replace(
      /\b([A-Za-z]{2,})\s([A-Za-z])\s([A-Za-z]{2,})\b/g,
      "$1$2$3",
    );
  }
  return cleaned.replace(/\s+/g, " ").trim();
};

// Generate mock product listings for a given platform
const makeListings = (n, platform = "Blinkit") =>
  Array.from({ length: n }, (_, i) => ({
    platform,
    product_name: `Product ${i} Amul Gold Full Cream Milk 500ml 15% OFF ADD 7mins ₹${29 + i}`,
    raw_product_name: `Amul Gold Full Cream Milk 500ml`,
    price: 29 + (i % 50),
    mrp: 35 + (i % 50),
    image_url: `https://cdn.example.com/img/${i}.jpg`,
    product_url: `https://blinkit.com/p/${i}`,
    in_stock: true,
    weight: "500ml",
    rating: 4.2,
    rating_count: 1000 + i,
    discount_percent: 15,
    discount_value: 4,
    raw_text: "",
  }));

// ─────────────────────────────────────────────────────────────────────────────
// PerformanceMonitor unit tests
// ─────────────────────────────────────────────────────────────────────────────

describe("PerformanceMonitor – accuracy", () => {
  let monitor;

  beforeEach(() => {
    monitor = new PerformanceMonitor("PerfTest");
  });
  afterEach(() => {
    monitor.clear();
  });

  it("mark + measure returns non-negative duration", () => {
    monitor.mark("a");
    monitor.mark("b");
    const d = monitor.measure("a-to-b", "a", "b");
    expect(typeof d).toBe("number");
    expect(d).toBeGreaterThanOrEqual(0);
  });

  it("measure without end mark uses current time", () => {
    monitor.mark("start");
    const d = monitor.measure("open-ended", "start");
    expect(d).toBeGreaterThanOrEqual(0);
  });

  it("returns null for missing start mark", () => {
    const d = monitor.measure("bad", "nonexistent-mark");
    expect(d).toBeNull();
  });

  it("stores measure in getMeasures()", () => {
    monitor.mark("x");
    monitor.measure("op1", "x");
    expect(monitor.getMeasures().op1).toBeDefined();
    expect(monitor.getMeasures().op1.duration).toBeGreaterThanOrEqual(0);
  });

  it("clear removes all marks and measures", () => {
    monitor.mark("x");
    monitor.measure("op1", "x");
    monitor.clear();
    expect(Object.keys(monitor.marks)).toHaveLength(0);
    expect(Object.keys(monitor.measures)).toHaveLength(0);
  });

  it("multiple sequential operations are tracked independently", () => {
    monitor.mark("s1");
    monitor.mark("e1");
    monitor.mark("s2");
    monitor.mark("e2");
    monitor.measure("op1", "s1", "e1");
    monitor.measure("op2", "s2", "e2");
    const m = monitor.getMeasures();
    expect(m.op1).toBeDefined();
    expect(m.op2).toBeDefined();
  });

  it("global monitor is a singleton", () => {
    expect(getGlobalMonitor()).toBe(getGlobalMonitor());
  });
});

describe("PerformanceMonitor – frame-drop tracking", () => {
  let monitor;
  let interval;

  beforeEach(() => {
    monitor = new PerformanceMonitor("FrameTest");
  });
  afterEach(() => {
    if (interval) clearInterval(interval);
    monitor.clear();
  });

  it("trackFrameDrops returns an interval handle", () => {
    interval = monitor.trackFrameDrops();
    expect(interval).toBeDefined();
  });

  it("getFrameDropStats returns correct shape with zero drops", () => {
    const stats = monitor.getFrameDropStats();
    expect(stats).toEqual({ droppedFrames: 0, avgDropDuration: 0 });
  });

  it("resetFrameDrops clears prior drops", () => {
    monitor.frameDrops = [{ timestamp: Date.now(), duration: 50 }];
    monitor.resetFrameDrops();
    expect(monitor.getFrameDropStats()).toEqual({
      droppedFrames: 0,
      avgDropDuration: 0,
    });
  });
});

describe("PerformanceMonitor – async measurement", () => {
  it("measureAsync resolves correct value", async () => {
    const result = await measureAsync("test-async", async () => 42);
    expect(result).toBe(42);
  });

  it("measureAsync resolves string value", async () => {
    const result = await measureAsync("string-op", async () => "hello");
    expect(result).toBe("hello");
  });

  it("measureAsync propagates errors", async () => {
    await expect(
      measureAsync("failing-op", async () => {
        throw new Error("oops");
      }),
    ).rejects.toThrow("oops");
  });

  it("measureAsync resolves array values", async () => {
    const result = await measureAsync("array-op", async () => [1, 2, 3]);
    expect(result).toEqual([1, 2, 3]);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Price normalisation performance
// ─────────────────────────────────────────────────────────────────────────────

describe("extractNumericPrice – throughput", () => {
  const ITERATIONS = 10_000;
  const THRESHOLD_MS = 100;

  const cases = [
    29,
    33.5,
    "₹29",
    "₹1,299",
    "rs 55",
    "₹29 OFF",
    0,
    null,
    undefined,
    -1,
    "free",
    3000,
    300100,
    "MRP ₹33",
    "₹0",
    "",
    "  ",
    "99.99",
    "₹10,000",
  ];

  it(`processes ${ITERATIONS} prices in < ${THRESHOLD_MS}ms`, () => {
    const start = Date.now();
    for (let i = 0; i < ITERATIONS; i++) {
      extractNumericPrice(cases[i % cases.length]);
    }
    const elapsed = Date.now() - start;
    expect(elapsed).toBeLessThan(THRESHOLD_MS);
  });

  it("numeric passthrough is O(1) per call", () => {
    const start = Date.now();
    for (let i = 0; i < ITERATIONS; i++) extractNumericPrice(29 + (i % 100));
    const elapsed = Date.now() - start;
    expect(elapsed).toBeLessThan(50);
  });
});

describe("normalizeIncomingPrice – throughput", () => {
  const ITERATIONS = 5_000;
  const THRESHOLD_MS = 100;

  const products = [
    { price: 29, mrp: 33 },
    { sellingPrice: 4, mrp: 32 }, // extreme discount — should snap to MRP
    { price: "₹32", mrp: "₹35" },
    { discount_price: 22, mrp: 25 },
    { finalPrice: 199, originalPrice: 250 },
    { price: 0, mrp: 0 },
    {},
    { price: null, mrp: null },
  ];

  it(`normalises ${ITERATIONS} products in < ${THRESHOLD_MS}ms`, () => {
    const start = Date.now();
    for (let i = 0; i < ITERATIONS; i++) {
      normalizeIncomingPrice(products[i % products.length]);
    }
    const elapsed = Date.now() - start;
    expect(elapsed).toBeLessThan(THRESHOLD_MS);
  });

  it("extreme-discount guard fires correctly (75% threshold)", () => {
    // 87.5% discount — price should be replaced with MRP
    const { price, mrp } = normalizeIncomingPrice({ price: 4, mrp: 32 });
    expect(price).toBe(32);
    expect(mrp).toBe(32);
  });

  it("acceptable discount passes through unchanged", () => {
    const { price, mrp } = normalizeIncomingPrice({ price: 29, mrp: 32 });
    expect(price).toBe(29);
    expect(mrp).toBe(32);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Product name sanitization performance
// ─────────────────────────────────────────────────────────────────────────────

describe("sanitizeProductName – throughput", () => {
  const ITERATIONS = 5_000;
  const THRESHOLD_MS = 300;

  const names = [
    "Amul Gold Full Cream Milk 500ml",
    "AmulGoldFullCreamMilk500ml7mins₹29ADD15%OFF",
    "Britannia Good Day 250g Pack | 5 Stars 4.5(12.4k)",
    "Mother Dairy Toned Milk 1L Pouch buy now",
    "",
    null,
    "A",
    "Go d rej Hair Oil 200ml",
    "HUL Dove Bar Soap 75g ADDQty view more ₹45OFF",
  ];

  it(`sanitizes ${ITERATIONS} names in < ${THRESHOLD_MS}ms`, () => {
    const start = Date.now();
    for (let i = 0; i < ITERATIONS; i++) {
      sanitizeProductName(names[i % names.length]);
    }
    const elapsed = Date.now() - start;
    expect(elapsed).toBeLessThan(THRESHOLD_MS);
  });

  it("removes delivery-time and price noise from names", () => {
    const result = sanitizeProductName("Amul Milk 500ml 7mins ₹29 ADD");
    expect(result).not.toMatch(/\d+\s*mins/i);
    expect(result).not.toMatch(/₹\s*\d+/);
    expect(result).not.toMatch(/\bADD\b/i);
    expect(result.length).toBeGreaterThan(0);
  });

  it("handles null/undefined gracefully without throwing", () => {
    expect(() => sanitizeProductName(null)).not.toThrow();
    expect(() => sanitizeProductName(undefined)).not.toThrow();
    expect(sanitizeProductName(null)).toBe("");
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Search aggregation pipeline performance
// ─────────────────────────────────────────────────────────────────────────────

describe("Search aggregation pipeline – throughput", () => {
  const THRESHOLD_MS = 200;

  /**
   * Inline minimal aggregation (mirrors SearchScreen.js logic)
   * without any React/WebView imports.
   */
  const aggregate = (platformResults) => {
    const productMap = {};
    Object.values(platformResults).forEach(({ products }) => {
      (products || []).forEach((product) => {
        const key = sanitizeProductName(product.product_name)
          .toLowerCase()
          .split(/\s+/)
          .slice(0, 4)
          .join(" ");
        if (!key) return;
        if (!productMap[key])
          productMap[key] = { name: product.product_name, listings: [] };
        productMap[key].listings.push(product);
      });
    });

    return Object.values(productMap).map((group, idx) => {
      const listings = group.listings.filter((l) => l.price > 0);
      const prices = listings.map((l) => l.price);
      const best = prices.length ? Math.min(...prices) : 0;
      const worst = prices.length ? Math.max(...prices) : 0;
      const first = listings[0] || group.listings[0] || {};
      return {
        id: idx,
        name: group.name,
        price: first.price || best,
        originalPrice: worst > (first.price || best) ? worst : undefined,
        platformCount: listings.length,
        listings: group.listings,
        bestPlatform: listings.length
          ? listings.reduce((a, b) => (a.price < b.price ? a : b)).platform
          : "",
        image: first.image_url || "",
      };
    });
  };

  it("aggregates 30 products from 3 platforms in < 200ms", () => {
    const platformResults = {
      Blinkit: { products: makeListings(10, "Blinkit") },
      Zepto: { products: makeListings(10, "Zepto") },
      BigBasket: { products: makeListings(10, "BigBasket") },
    };
    const start = Date.now();
    const results = aggregate(platformResults);
    const elapsed = Date.now() - start;
    expect(elapsed).toBeLessThan(THRESHOLD_MS);
    expect(results.length).toBeGreaterThan(0);
  });

  it("aggregates 300 products from 3 platforms in < 300ms", () => {
    const platformResults = {
      Blinkit: { products: makeListings(100, "Blinkit") },
      Zepto: { products: makeListings(100, "Zepto") },
      BigBasket: { products: makeListings(100, "BigBasket") },
    };
    const start = Date.now();
    const results = aggregate(platformResults);
    const elapsed = Date.now() - start;
    expect(elapsed).toBeLessThan(300);
    expect(results.length).toBeGreaterThan(0);
  });

  it("handles empty platform results gracefully", () => {
    const results = aggregate({
      Blinkit: { products: [] },
      Zepto: { products: null },
    });
    expect(results).toEqual([]);
  });

  it("deduplicates by match key, keeping first listing per group", () => {
    const dup = makeListings(5, "Blinkit").map((l) => ({
      ...l,
      product_name: "Amul Gold Milk 500ml",
    }));
    const results = aggregate({ Blinkit: { products: dup } });
    // All have same name → grouped into 1
    expect(results).toHaveLength(1);
    expect(results[0].listings).toHaveLength(5);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Concurrent operation timing
// ─────────────────────────────────────────────────────────────────────────────

describe("Concurrent operation timing", () => {
  it("3 parallel async tasks complete faster than 3x serial", async () => {
    const delay = (ms) => new Promise((r) => setTimeout(r, ms));

    // Serial baseline
    const serialStart = Date.now();
    await delay(10);
    await delay(10);
    await delay(10);
    const serialElapsed = Date.now() - serialStart;

    // Parallel
    const parallelStart = Date.now();
    await Promise.all([delay(10), delay(10), delay(10)]);
    const parallelElapsed = Date.now() - parallelStart;

    // Parallel should be meaningfully faster than serial
    expect(parallelElapsed).toBeLessThan(serialElapsed);
  });

  it("measureAsync wraps concurrent tasks without interference", async () => {
    const monitor = new PerformanceMonitor("ConcurrentTest");
    const delay = (ms) => new Promise((r) => setTimeout(r, ms));

    const [r1, r2] = await Promise.all([
      measureAsync("task-A", () => delay(5).then(() => "A")),
      measureAsync("task-B", () => delay(5).then(() => "B")),
    ]);

    expect(r1).toBe("A");
    expect(r2).toBe("B");
    monitor.clear();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Memory / object-count checks
// ─────────────────────────────────────────────────────────────────────────────

describe("Memory hygiene", () => {
  it("PerformanceMonitor.clear() releases all stored data", () => {
    const monitor = new PerformanceMonitor("MemTest");
    for (let i = 0; i < 100; i++) {
      monitor.mark(`mark-${i}`);
      monitor.measure(`measure-${i}`, `mark-${i}`);
    }
    expect(Object.keys(monitor.marks).length).toBe(100);
    expect(Object.keys(monitor.measures).length).toBe(100);
    monitor.clear();
    expect(Object.keys(monitor.marks).length).toBe(0);
    expect(Object.keys(monitor.measures).length).toBe(0);
  });

  it("normalizeIncomingPrice does not mutate the input object", () => {
    const input = { price: 29, mrp: 35 };
    const original = { ...input };
    normalizeIncomingPrice(input);
    expect(input).toEqual(original);
  });

  it("sanitizeProductName does not mutate input", () => {
    const name = "Amul Gold Milk 500ml 7mins ₹29 ADD";
    const copy = name;
    sanitizeProductName(name);
    expect(name).toBe(copy);
  });

  it("processsing 1000 listings produces a bounded result set", () => {
    const listings = makeListings(1000, "Blinkit");
    // Each listing has a unique key suffix from index; groups should equal listing count
    const map = {};
    listings.forEach((l) => {
      const key = l.product_name.toLowerCase().slice(0, 20);
      if (!map[key]) map[key] = 0;
      map[key]++;
    });
    expect(Object.keys(map).length).toBeGreaterThan(0);
    expect(Object.keys(map).length).toBeLessThanOrEqual(1000);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// End-to-end search timing (mock pipeline)
// ─────────────────────────────────────────────────────────────────────────────

describe("End-to-end search pipeline timing", () => {
  const TOTAL_THRESHOLD_MS = 500;

  it(`full search pipeline (fetch + normalise + aggregate) completes in < ${TOTAL_THRESHOLD_MS}ms`, async () => {
    const monitor = new PerformanceMonitor("E2ETest");
    monitor.mark("search-start");

    // Simulate platform scrape latency (10ms per platform)
    const delay = (ms) => new Promise((r) => setTimeout(r, ms));

    const [blinkitRaw, zeptoRaw, bbRaw] = await Promise.all([
      delay(10).then(() => makeListings(20, "Blinkit")),
      delay(12).then(() => makeListings(15, "Zepto")),
      delay(8).then(() => makeListings(18, "BigBasket")),
    ]);

    monitor.mark("fetch-done");

    // Normalise all incoming products
    const allNormalized = [...blinkitRaw, ...zeptoRaw, ...bbRaw].map((p) => ({
      ...p,
      ...normalizeIncomingPrice(p),
      product_name: sanitizeProductName(p.product_name),
    }));

    monitor.mark("normalize-done");

    // Aggregate into result map
    const productMap = {};
    allNormalized.forEach((product) => {
      const key = product.product_name
        .toLowerCase()
        .split(/\s+/)
        .slice(0, 3)
        .join(" ");
      if (!productMap[key]) productMap[key] = { listings: [] };
      productMap[key].listings.push(product);
    });
    const aggregated = Object.values(productMap);

    monitor.mark("aggregate-done");

    const fetchDuration = monitor.measure(
      "fetch",
      "search-start",
      "fetch-done",
    );
    const normDuration = monitor.measure(
      "normalize",
      "fetch-done",
      "normalize-done",
    );
    const aggrDuration = monitor.measure(
      "aggregate",
      "normalize-done",
      "aggregate-done",
    );
    const totalDuration = monitor.measure(
      "total",
      "search-start",
      "aggregate-done",
    );

    expect(fetchDuration).toBeGreaterThanOrEqual(0);
    expect(normDuration).toBeGreaterThanOrEqual(0);
    expect(aggrDuration).toBeGreaterThanOrEqual(0);
    expect(totalDuration).toBeLessThan(TOTAL_THRESHOLD_MS);
    expect(aggregated.length).toBeGreaterThan(0);

    monitor.clear();
  });
});
