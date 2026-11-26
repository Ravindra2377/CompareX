import api, { API_URL, SCRAPER_API_URL } from "../api";

describe("api runtime exports", () => {
  it("provides stable URL exports", () => {
    expect(typeof API_URL).toBe("string");
    expect(API_URL.length).toBeGreaterThan(0);
    expect(SCRAPER_API_URL).toContain("/compare");
  });

  it("axios client has baseURL", () => {
    expect(api).toBeDefined();
    expect(api.defaults.baseURL).toBe(API_URL);
  });
});
