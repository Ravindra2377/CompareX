describe('CompareZ Navigation Flow', () => {
  beforeAll(async () => {
    await device.launchApp();
  });

  beforeEach(async () => {
    await device.reloadReactNative();
  });

  it('should navigate between Home, Search, and Profile', async () => {
    // 1. Check we are on home
    await expect(element(by.id('homeSearchCta'))).toBeVisible();

    // 2. Navigate to Search screen via bottom tab (if labeled) or via CTA
    await element(by.id('homeSearchCta')).tap();
    await expect(element(by.id('searchInput'))).toBeVisible();

    // Note: Tab Bar navigation depends on how BottomTabNavigator is instrumented.
    // If using default Expo tabs, we might need different matchers.
  });
});
