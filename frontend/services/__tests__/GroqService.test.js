import GroqService from "../GroqService";

describe("GroqService", () => {
  const originalFetch = global.fetch;

  afterEach(() => {
    global.fetch = originalFetch;
    jest.clearAllMocks();
  });

  it("should expand a search query", async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        choices: [
          {
            message: {
              content: JSON.stringify({ keyword: "best smartphone", isNaturalLanguage: true }),
            },
          },
        ],
      }),
    });

    const res = await GroqService.expandSearchQuery("which smartphone has best camera under 50k");
    expect(res.keyword).toBe("best smartphone");
    expect(res.isNaturalLanguage).toBe(true);
  });

  it("should parse research streaming events via researchStream", async () => {
    const sseChunks = [
      'event: intent\ndata: {"intent": "shopping"}\n\n',
      'event: sources\ndata: [{"title": "Official Specs", "domain": "apple.com", "url": "https://apple.com"}]\n\n',
      'event: done\ndata: {"summary": "Grounded comparison", "key_takeaways": ["Takeaway 1"], "sources": [{"number": 1, "title": "Official Specs", "url": "https://apple.com"}]}\n\n',
    ].join("");

    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      text: async () => sseChunks,
    });

    const onIntent = jest.fn();
    const onSources = jest.fn();
    const onDone = jest.fn();

    const res = await GroqService.researchStream(
      "iPhone 16 vs Galaxy S25",
      "compare",
      [],
      { city: "Bengaluru" },
      { onIntent, onSources, onDone }
    );

    expect(onIntent).toHaveBeenCalledWith("shopping");
    expect(onSources).toHaveBeenCalledWith(
      expect.arrayContaining([expect.objectContaining({ title: "Official Specs" })])
    );
    expect(onDone).toHaveBeenCalled();
    expect(res.summary).toBe("Grounded comparison");
    expect(res.keyTakeaways).toEqual(["Takeaway 1"]);
  });

  it("should fallback to standard research if researchStream fails", async () => {
    const mockResearchData = {
      summary: "Fallback grounded summary",
      key_takeaways: ["Standard point"],
      sources: [],
    };

    let callCount = 0;
    global.fetch = jest.fn().mockImplementation((url) => {
      callCount++;
      if (url.includes("/ai/research/stream")) {
        return Promise.reject(new Error("Stream network error"));
      }
      return Promise.resolve({
        ok: true,
        json: async () => mockResearchData,
      });
    });

    const onError = jest.fn();
    const res = await GroqService.researchStream(
      "MacBook Air M3",
      "all",
      [],
      {},
      { onError }
    );

    expect(onError).toHaveBeenCalled();
    expect(res.summary).toBe("Fallback grounded summary");
    expect(res.keyTakeaways).toEqual(["Standard point"]);
  });
});
