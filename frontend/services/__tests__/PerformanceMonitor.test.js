import {
  PerformanceMonitor,
  getGlobalMonitor,
  measureAsync,
} from "../PerformanceMonitor";

describe("PerformanceMonitor", () => {
  let monitor;
  let intervalId;

  beforeEach(() => {
    monitor = new PerformanceMonitor("TestApp");
    intervalId = null;
  });

  afterEach(() => {
    if (intervalId) {
      clearInterval(intervalId);
    }
  });

  it("creates marks and measures durations", () => {
    monitor.mark("start");
    monitor.mark("end");

    const duration = monitor.measure("op", "start", "end");
    expect(typeof duration).toBe("number");
    expect(duration).toBeGreaterThanOrEqual(0);
    expect(monitor.getMeasures().op).toBeDefined();
  });

  it("returns null when start mark is missing", () => {
    const duration = monitor.measure("bad-op", "missing-start", "end");
    expect(duration).toBeNull();
  });

  it("clear resets marks and measures", () => {
    monitor.mark("start");
    monitor.mark("end");
    monitor.measure("op", "start", "end");

    monitor.clear();
    expect(Object.keys(monitor.marks)).toHaveLength(0);
    expect(Object.keys(monitor.measures)).toHaveLength(0);
  });

  it("trackFrameDrops returns interval handle", () => {
    intervalId = monitor.trackFrameDrops();
    expect(intervalId).toBeDefined();
    expect(typeof intervalId).toBe("object");
  });

  it("getFrameDropStats returns default shape when empty", () => {
    const stats = monitor.getFrameDropStats();
    expect(stats).toEqual({ droppedFrames: 0, avgDropDuration: 0 });
  });

  it("global monitor is singleton", () => {
    const a = getGlobalMonitor();
    const b = getGlobalMonitor();
    expect(a).toBe(b);
  });

  it("measureAsync records operation and resolves value", async () => {
    const result = await measureAsync("async-op", async () => "ok");
    expect(result).toBe("ok");
  });
});
