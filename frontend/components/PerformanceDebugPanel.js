/**
 * Performance debug panel - displays real-time performance metrics on screen
 */

import React, { useState, useEffect } from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { getGlobalMonitor } from "../services/PerformanceMonitor";

const COLORS = {
  good: "#22c55e", // Green
  warning: "#f59e0b", // Amber
  critical: "#ef4444", // Red
  bg: "rgba(0, 0, 0, 0.75)",
  text: "#ffffff",
};

const isPerformanceGood = (value, threshold) => {
  if (value < threshold) return COLORS.good;
  if (value < threshold * 1.5) return COLORS.warning;
  return COLORS.critical;
};

export const PerformanceDebugPanel = ({ enabled = false }) => {
  const [isOpen, setIsOpen] = useState(enabled);
  const [metrics, setMetrics] = useState({
    fps: 60,
    droppedFrames: 0,
    avgDropDuration: 0,
    maxDropDuration: 0,
    recentMeasures: {},
  });

  useEffect(() => {
    if (!isOpen) return;

    const monitor = getGlobalMonitor();

    // Start frame drop tracking if not already running
    const frameDropInterval = monitor.trackFrameDrops();

    // Update metrics every 500ms
    const updateInterval = setInterval(() => {
      const frameStats = monitor.getFrameDropStats();
      const measures = monitor.getMeasures();

      // Get last 5 measures
      const measureKeys = Object.keys(measures).slice(-5);
      const recentMeasures = {};
      measureKeys.forEach((key) => {
        recentMeasures[key] = measures[key].duration.toFixed(2);
      });

      setMetrics({
        fps: frameStats.fps,
        droppedFrames: frameStats.droppedFrames,
        avgDropDuration: parseFloat(frameStats.avgDropDuration),
        maxDropDuration: frameStats.maxDropDuration || 0,
        recentMeasures,
      });
    }, 500);

    return () => {
      clearInterval(updateInterval);
      clearInterval(frameDropInterval);
    };
  }, [isOpen]);

  if (!isOpen) {
    return (
      <TouchableOpacity style={styles.fab} onPress={() => setIsOpen(true)}>
        <Ionicons name="speedometer-outline" size={20} color="#ffffff" />
      </TouchableOpacity>
    );
  }

  const fpsColor = isPerformanceGood(metrics.fps, 50);
  const dropColor =
    metrics.droppedFrames > 5
      ? COLORS.critical
      : metrics.droppedFrames > 1
        ? COLORS.warning
        : COLORS.good;

  return (
    <View style={styles.panelContainer}>
      <View style={styles.header}>
        <Text style={styles.title}>Performance Monitor</Text>
        <TouchableOpacity onPress={() => setIsOpen(false)}>
          <Ionicons name="close" size={20} color={COLORS.text} />
        </TouchableOpacity>
      </View>

      <View style={styles.content}>
        {/* FPS */}
        <View style={styles.metric}>
          <Text style={styles.label}>FPS</Text>
          <Text style={[styles.value, { color: fpsColor }]}>{metrics.fps}</Text>
        </View>

        {/* Frame Drops */}
        <View style={styles.metric}>
          <Text style={styles.label}>Dropped Frames</Text>
          <Text style={[styles.value, { color: dropColor }]}>
            {metrics.droppedFrames}
          </Text>
        </View>

        {/* Avg Drop Duration */}
        {metrics.droppedFrames > 0 && (
          <View style={styles.metric}>
            <Text style={styles.label}>Avg Drop (ms)</Text>
            <Text style={styles.value}>
              {metrics.avgDropDuration.toFixed(1)}
            </Text>
          </View>
        )}

        {/* Recent Measures */}
        {Object.keys(metrics.recentMeasures).length > 0 && (
          <View style={styles.measuresContainer}>
            <Text style={[styles.label, { marginBottom: 8 }]}>
              Recent Operations
            </Text>
            {Object.entries(metrics.recentMeasures).map(([name, duration]) => (
              <View key={name} style={styles.measureRow}>
                <Text style={styles.measureName}>{name}</Text>
                <Text style={styles.measureTime}>{duration}ms</Text>
              </View>
            ))}
          </View>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  fab: {
    position: "absolute",
    bottom: 24,
    right: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "#3b82f6",
    justifyContent: "center",
    alignItems: "center",
    elevation: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    zIndex: 999,
  },
  panelContainer: {
    position: "absolute",
    bottom: 24,
    right: 24,
    width: 280,
    backgroundColor: COLORS.bg,
    borderRadius: 8,
    overflow: "hidden",
    elevation: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    zIndex: 999,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255, 255, 255, 0.1)",
  },
  title: {
    color: COLORS.text,
    fontWeight: "bold",
    fontSize: 12,
  },
  content: {
    padding: 12,
  },
  metric: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255, 255, 255, 0.05)",
  },
  label: {
    color: COLORS.text,
    fontSize: 11,
    opacity: 0.8,
  },
  value: {
    color: COLORS.text,
    fontSize: 14,
    fontWeight: "bold",
  },
  measuresContainer: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: "rgba(255, 255, 255, 0.1)",
  },
  measureRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 4,
  },
  measureName: {
    color: COLORS.text,
    fontSize: 10,
    opacity: 0.8,
    maxWidth: "60%",
  },
  measureTime: {
    color: COLORS.text,
    fontSize: 11,
    fontWeight: "600",
  },
});

export default PerformanceDebugPanel;
