describe("tooling config files", () => {
  it("jest config has transform", () => {
    const cfg = require("../../jest.config");
    expect(cfg.transform).toBeDefined();
  });

  it("metro config exports object", () => {
    const metro = require("../../metro.config");
    expect(metro).toBeDefined();
    expect(typeof metro).toBe("object");
  });
});
