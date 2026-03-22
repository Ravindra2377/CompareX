import PlatformDOMScraperService from "../PlatformDOMScraperService";

describe("PlatformDOMScraperService", () => {
  it("should return a search URL for Blinkit", () => {
    const url = PlatformDOMScraperService.getSearchUrl("Blinkit", "eggs");
    expect(url).toBe("https://blinkit.com/s/?q=eggs");
  });

  it("should return a search URL for BigBasket", () => {
    const url = PlatformDOMScraperService.getSearchUrl("BigBasket", "rice");
    expect(url).toBe("https://www.bigbasket.com/ps/?q=rice");
  });

  it("should return a search URL for Zepto", () => {
    const url = PlatformDOMScraperService.getSearchUrl("Zepto", "milk");
    expect(url).toBe("https://www.zepto.com/search?query=milk");
  });

  it("should return a parse script for Blinkit", () => {
    const script = PlatformDOMScraperService.getParseScript("Blinkit");
    expect(script).toContain("Blinkit-DOM");
  });

  it("should return a parse script for BigBasket", () => {
    const script = PlatformDOMScraperService.getParseScript("BigBasket");
    expect(script).toContain("BigBasket-DOM");
  });

  it("should return null for unsupported platform", () => {
    const url = PlatformDOMScraperService.getSearchUrl("Unsupported", "item");
    expect(url).toBeNull();
    const script = PlatformDOMScraperService.getParseScript("Unsupported");
    expect(script).toBeNull();
  });
});
