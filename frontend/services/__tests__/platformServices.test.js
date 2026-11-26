import PlatformDOMScraperService from "../PlatformDOMScraperService";

describe("PlatformDOMScraperService", () => {
  it("exports service instance", () => {
    expect(PlatformDOMScraperService).toBeDefined();
    expect(typeof PlatformDOMScraperService.getSearchUrl).toBe("function");
    expect(typeof PlatformDOMScraperService.getParseScript).toBe("function");
  });

  it("returns url for known platform", () => {
    const url = PlatformDOMScraperService.getSearchUrl(
      "Blinkit",
      "eggs",
      12.97,
      77.59,
    );
    expect(typeof url).toBe("string");
    expect(url.toLowerCase()).toContain("blinkit");
  });

  it("returns parse script for known platform", () => {
    const script = PlatformDOMScraperService.getParseScript("Zepto", {});
    expect(typeof script).toBe("string");
    expect(script).toContain("SEARCH_RESULTS");
  });

  it("returns null for unknown platform", () => {
    expect(PlatformDOMScraperService.getSearchUrl("Unknown", "x")).toBeNull();
    expect(PlatformDOMScraperService.getParseScript("Unknown", {})).toBeNull();
  });
});
