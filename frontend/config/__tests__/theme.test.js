import { COLORS, SPACING, RADIUS, SHADOWS } from "../theme";

describe("Theme Configuration", () => {
  describe("COLORS", () => {
    it("should export color palette", () => {
      expect(COLORS).toBeDefined();
      expect(COLORS.primary).toBeDefined();
      expect(COLORS.accent).toBeDefined();
    });

    it("should have semantic color tokens", () => {
      expect(COLORS.primary).toBe("#5B5AE6");
      expect(COLORS.accent).toBe("#4F46E5");
      expect(COLORS.savings).toBe("#10B981");
      expect(COLORS.error).toBe("#EF4444");
      expect(COLORS.warning).toBe("#F59E0B");
    });

    it("should have background and surface colors", () => {
      expect(COLORS.background).toBe("#F8FAFC");
      expect(COLORS.surface).toBe("#FFFFFF");
      expect(COLORS.card).toBe("#FFFFFF");
    });

    it("should have text colors", () => {
      expect(COLORS.textPrimary).toBe("#0F172A");
      expect(COLORS.textSecondary).toBe("#64748B");
      expect(COLORS.textTertiary).toBe("#94A3B8");
    });

    it("should have gradient arrays", () => {
      expect(Array.isArray(COLORS.gradientHero)).toBe(true);
      expect(COLORS.gradientHero.length).toBeGreaterThanOrEqual(2);
      expect(Array.isArray(COLORS.gradientAccent)).toBe(true);
      expect(Array.isArray(COLORS.gradientSavings)).toBe(true);
    });

    it("should have muted variants", () => {
      expect(COLORS.accentMuted).toBeDefined();
      expect(COLORS.savingsLight).toBeDefined();
      expect(COLORS.errorLight).toBeDefined();
      expect(COLORS.warningLight).toBeDefined();
    });
  });

  describe("SPACING", () => {
    it("should export spacing scale", () => {
      expect(SPACING).toBeDefined();
      expect(SPACING.xs).toBe(4);
      expect(SPACING.sm).toBe(8);
      expect(SPACING.md).toBe(16);
      expect(SPACING.lg).toBe(16);
    });

    it("should have consistent spacing increments", () => {
      expect(SPACING.xs).toBeLessThan(SPACING.sm);
      expect(SPACING.sm).toBeLessThanOrEqual(SPACING.md);
      expect(SPACING.md).toBeLessThanOrEqual(SPACING.lg);
      expect(SPACING.lg).toBeLessThanOrEqual(SPACING.xl);
    });

    it("should have large spacing options", () => {
      expect(SPACING.xxl).toBe(24);
      expect(SPACING.xxxl).toBe(32);
      expect(SPACING.huge).toBe(48);
    });
  });

  describe("RADIUS", () => {
    it("should export border radius scale", () => {
      expect(RADIUS).toBeDefined();
      expect(RADIUS.xs).toBe(6);
      expect(RADIUS.sm).toBe(10);
      expect(RADIUS.md).toBe(14);
    });

    it("should have full radius for circular elements", () => {
      expect(RADIUS.full).toBe(999);
    });

    it("should have consistent radius increments", () => {
      expect(RADIUS.xs).toBeLessThan(RADIUS.sm);
      expect(RADIUS.sm).toBeLessThan(RADIUS.md);
      expect(RADIUS.md).toBeLessThan(RADIUS.lg);
    });
  });

  describe("SHADOWS", () => {
    it("should export shadow definitions", () => {
      expect(SHADOWS).toBeDefined();
      expect(SHADOWS.none).toBeDefined();
      expect(SHADOWS.sm).toBeDefined();
      expect(SHADOWS.md).toBeDefined();
    });

    it("should have shadow properties", () => {
      expect(SHADOWS.sm).toHaveProperty("shadowColor");
      expect(SHADOWS.sm).toHaveProperty("shadowOffset");
      expect(SHADOWS.sm).toHaveProperty("shadowOpacity");
      expect(SHADOWS.sm).toHaveProperty("shadowRadius");
      expect(SHADOWS.sm).toHaveProperty("elevation");
    });

    it("should have increasing opacity for larger shadows", () => {
      expect(SHADOWS.sm.shadowOpacity).toBeLessThan(SHADOWS.md.shadowOpacity);
    });

    it("should have glow shadow", () => {
      expect(SHADOWS.glow).toBeDefined();
      expect(SHADOWS.glow.shadowColor).toBe("#5B5AE6");
    });

    it("should have valid shadow values", () => {
      expect(SHADOWS.sm.shadowOpacity).toBeGreaterThanOrEqual(0);
      expect(SHADOWS.sm.shadowOpacity).toBeLessThanOrEqual(1);
      expect(SHADOWS.md.elevation).toBeGreaterThan(0);
    });
  });

  describe("Theme Integration", () => {
    it("should have complementary colors", () => {
      expect(COLORS.accentMuted).toBeDefined();
    });

    it("should support gradients for visual hierarchy", () => {
      expect(COLORS.gradientHero.length).toBeGreaterThan(0);
      expect(COLORS.gradientCard.length).toBeGreaterThan(0);
    });
  });
});
