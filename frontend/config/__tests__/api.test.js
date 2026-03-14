import api, { API_URL, SCRAPER_API_URL } from "../api";

describe("API Config", () => {
  it("should export an axios instance", () => {
    expect(api).toBeDefined();
    expect(typeof api.get).toBe("function");
    expect(typeof api.post).toBe("function");
    expect(typeof api.put).toBe("function");
    expect(typeof api.delete).toBe("function");
  });

  it("should have a baseURL configured", () => {
    expect(API_URL).toBeDefined();
    expect(typeof API_URL).toBe("string");
    expect(api.defaults.baseURL).toBeDefined();
    expect(api.defaults.baseURL).toBe(API_URL);
  });

  it("should export compare endpoint", () => {
    expect(SCRAPER_API_URL).toContain("/compare");
  });

  it("should allow setting custom headers", () => {
    if (!api.defaults.headers) {
      api.defaults.headers = {};
    }
    if (!api.defaults.headers.common) {
      api.defaults.headers.common = {};
    }
    api.defaults.headers.common["Authorization"] = "Bearer test-token";

    expect(api.defaults.headers.common["Authorization"]).toBe(
      "Bearer test-token",
    );
  });
});
