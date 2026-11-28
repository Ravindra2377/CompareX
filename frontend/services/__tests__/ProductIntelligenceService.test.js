import ProductIntelligenceService from "../ProductIntelligenceService";
import AsyncStorage from "@react-native-async-storage/async-storage";

describe("ProductIntelligenceService", () => {
  let storage = {};

  beforeEach(() => {
    jest.clearAllMocks();
    storage = {};
    AsyncStorage.getItem.mockImplementation(async (key) => storage[key] || null);
    AsyncStorage.setItem.mockImplementation(async (key, val) => {
      storage[key] = String(val);
    });
    AsyncStorage.removeItem.mockImplementation(async (key) => {
      delete storage[key];
    });
    global.fetch = jest.fn();
  });

  describe("discoverProducts", () => {
    it("returns dynamic products from backend when fetch succeeds", async () => {
      const mockBackendProducts = [
        { id: "sony-wh1000xm5", name: "Sony WH-1000XM5", category: "Headphones" },
      ];
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ products: mockBackendProducts }),
      });

      const res = await ProductIntelligenceService.discoverProducts({ category: "Headphones" });
      expect(res).toEqual(mockBackendProducts);
    });

    it("falls back to verified catalog on network error", async () => {
      global.fetch.mockRejectedValueOnce(new Error("Network failed"));

      const res = await ProductIntelligenceService.discoverProducts({ category: "Headphones" });
      expect(Array.isArray(res)).toBe(true);
      expect(res.length).toBeGreaterThan(0);
      expect(res[0].category.toLowerCase()).toBe("headphones");
    });

    it("filters fallback catalog by query", async () => {
      global.fetch.mockRejectedValueOnce(new Error("Offline"));

      const res = await ProductIntelligenceService.discoverProducts({ query: "travel" });
      expect(Array.isArray(res)).toBe(true);
      expect(res.some((p) => p.name.includes("Sony") || p.name.includes("Bose"))).toBe(true);
    });
  });

  describe("getProduct", () => {
    it("returns full product dossier by id", async () => {
      const prod = await ProductIntelligenceService.getProduct("sony-wh1000xm5");
      expect(prod).toBeTruthy();
      expect(prod.name).toBe("Sony WH-1000XM5");
      expect(prod.specifications.length).toBeGreaterThan(0);
      expect(prod.pros.length).toBeGreaterThan(0);
      expect(prod.cons.length).toBeGreaterThan(0);
    });

    it("returns null for non-existent product", async () => {
      const prod = await ProductIntelligenceService.getProduct("non-existent-xyz-999");
      expect(prod).toBeNull();
    });
  });

  describe("compareProducts", () => {
    it("builds a multi-product comparison matrix", async () => {
      const matrix = await ProductIntelligenceService.compareProducts([
        "sony-wh1000xm5",
        "bose-qc-ultra",
      ]);
      expect(matrix).toBeTruthy();
      expect(matrix.products.length).toBe(2);
      expect(matrix.attributes.length).toBeGreaterThan(0);
      expect(matrix.verdict).toBeTruthy();
    });
  });

  describe("getPersonalizedRecommendations", () => {
    it("calculates personalized ranking with custom weights", async () => {
      const rec = await ProductIntelligenceService.getPersonalizedRecommendations({
        category: "Headphones",
        weights: { battery: 50, sound: 30, comfort: 20 },
      });
      expect(rec).toBeTruthy();
      expect(rec.ranked_products.length).toBeGreaterThan(0);
      expect(rec.ranked_products[0].overall_score).toBeGreaterThan(0);
      expect(rec.ranked_products[0].score_breakdown).toBeDefined();

      // Ensure ranked products are sorted descending
      const scores = rec.ranked_products.map((r) => r.overall_score);
      for (let i = 0; i < scores.length - 1; i++) {
        expect(scores[i]).toBeGreaterThanOrEqual(scores[i + 1]);
      }
    });
  });

  describe("saveProduct & getSavedProducts", () => {
    it("saves and retrieves products from storage", async () => {
      const testProd = { id: "test-item-1", name: "Test Product", category: "Audio" };
      const saved = await ProductIntelligenceService.saveProduct(testProd);
      expect(saved).toBe(true);

      const list = await ProductIntelligenceService.getSavedProducts();
      expect(list.length).toBe(1);
      expect(list[0].id).toBe("test-item-1");

      const removed = await ProductIntelligenceService.removeSavedProduct("test-item-1");
      expect(removed).toBe(true);

      const afterRemove = await ProductIntelligenceService.getSavedProducts();
      expect(afterRemove.length).toBe(0);
    });
  });
});
