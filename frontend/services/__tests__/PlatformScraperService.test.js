import PlatformScraperService from "../PlatformScraperService";

describe("PlatformScraperService", () => {
  it("should return a search script for Blinkit", () => {
    const script = PlatformScraperService.getSearchScript("Blinkit", "milk", 12.9716, 77.5946);
    expect(script).toContain("Blinkit");
    expect(script).toContain("milk");
    expect(script).toContain("${lat}");
    expect(script).toContain("${lng}");
  });

  it("should return a search script for Zepto", () => {
    const script = PlatformScraperService.getSearchScript("Zepto", "bread");
    expect(script).toContain("Zepto");
    expect(script).toContain("bread");
  });

  it("should return a search script for BigBasket", () => {
    const script = PlatformScraperService.getSearchScript("BigBasket", "egg");
    expect(script).toContain("BigBasket");
    expect(script).toContain("egg");
  });

  it("should return null for unsupported platform", () => {
    const script = PlatformScraperService.getSearchScript("Unsupported", "item");
    expect(script).toBeNull();
  });
});
