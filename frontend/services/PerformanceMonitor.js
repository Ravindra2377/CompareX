/**
 * Performance monitoring utilities for React Native.
 * Tracks render times, frame drops, and operation timing.
 */

import React from "react";

class PerformanceMonitor {
  constructor(name = "App") {
    this.name = name;
    this.marks = {};
    this.measures = {};
    this.frameDrops = [];
    this.lastFrameTime = Date.now();
    this.fps = 60;
  }

  /**
   * Mark a performance checkpoint
   */
  mark(name) {
    this.marks[name] = {
      time: Date.now(),
      hrTime: global.nativePerformanceNow?.() || Date.now(),
    };
  }

  /**
   * Measure time between two marks or from mark to now
   */
  measure(name, startMark, endMark = null) {
    const startTime =
      this.marks[startMark]?.hrTime || this.marks[startMark]?.time;
    const endTime = endMark
      ? this.marks[endMark]?.hrTime || this.marks[endMark]?.time
      : global.nativePerformanceNow?.() || Date.now();

    if (!startTime) {
      console.warn(`[Perf] Start mark "${startMark}" not found`);
      return null;
    }

    const duration = endTime - startTime;
    this.measures[name] = {
      startMark,
      endMark: endMark || "now",
      duration,
      timestamp: Date.now(),
    };

    return duration;
  }

  /**
   * Get all measures
   */
  getMeasures() {
    return this.measures;
  }

  /**
   * Clear all marks and measures
   */
  clear() {
    this.marks = {};
    this.measures = {};
  }

  /**
   * Log all performance data
   */
  logAll() {
    console.log(`\n===== ${this.name} Performance Report =====`);
    Object.entries(this.measures).forEach(([name, data]) => {
      console.log(`${name}: ${data.duration.toFixed(2)}ms`);
    });
    console.log("==========================================\n");
  }

  /**
   * Track frame drops (throttled version)
   */
  trackFrameDrops() {
    return setInterval(() => {
      const now = Date.now();
      const deltaTime = now - this.lastFrameTime;
      this.lastFrameTime = now;

      // At 60 FPS, ideal frame time is ~16.67ms
      // At 120 FPS, ideal frame time is ~8.33ms
      // Consider a frame dropped if it takes > 33ms (2+ frames on 60Hz display)
      if (deltaTime > 33) {
        this.frameDrops.push({
          timestamp: now,
          duration: deltaTime,
        });
      }

      this.fps = Math.round(1000 / deltaTime);
    }, 1000 / 60); // Check ~60 times per second
  }

  /**
   * Get frame drop stats
   */
  getFrameDropStats() {
    if (this.frameDrops.length === 0) {
      return { droppedFrames: 0, avgDropDuration: 0 };
    }

    const avgDropDuration =
      this.frameDrops.reduce((sum, drop) => sum + drop.duration, 0) /
      this.frameDrops.length;

    return {
      droppedFrames: this.frameDrops.length,
      avgDropDuration: avgDropDuration.toFixed(2),
      maxDropDuration: Math.max(...this.frameDrops.map((d) => d.duration)),
      fps: this.fps,
    };
  }

  /**
   * Reset frame drop tracking
   */
  resetFrameDrops() {
    this.frameDrops = [];
  }
}

// Global singleton instance
let globalMonitor = null;

export function getGlobalMonitor() {
  if (!globalMonitor) {
    globalMonitor = new PerformanceMonitor("CompareZ");
  }
  return globalMonitor;
}

export function createMonitor(name) {
  return new PerformanceMonitor(name);
}

/**
 * Hook to measure component render time
 */
export function useMeasureRender(componentName) {
  const monitor = getGlobalMonitor();

  React.useEffect(() => {
    monitor.mark(`${componentName}-render-start`);

    return () => {
      const duration = monitor.measure(
        `${componentName}-render`,
        `${componentName}-render-start`,
      );
      if (duration && duration > 50) {
        console.warn(
          `[Perf] ${componentName} render took ${duration.toFixed(2)}ms`,
        );
      }
    };
  }, [componentName, monitor]);
}

/**
 * Measure async operation timing
 */
export async function measureAsync(operationName, asyncFn) {
  const monitor = getGlobalMonitor();
  const startMark = `${operationName}-start`;
  const endMark = `${operationName}-end`;

  monitor.mark(startMark);

  try {
    const result = await asyncFn();
    monitor.mark(endMark);
    const duration = monitor.measure(operationName, startMark, endMark);

    console.log(`[Perf] ${operationName}: ${duration.toFixed(2)}ms`);
    return result;
  } catch (err) {
    monitor.mark(endMark);
    const duration = monitor.measure(operationName, startMark, endMark);
    console.error(
      `[Perf] ${operationName} failed after ${duration.toFixed(2)}ms:`,
      err,
    );
    throw err;
  }
}

export { PerformanceMonitor };

export default PerformanceMonitor;
