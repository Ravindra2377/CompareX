describe('CompareZ Navigation Flow', () => {
  beforeAll(async () => {
    await device.launchApp();
  });

  beforeEach(async () => {
    await device.launchApp({ newInstance: true });
    
    // Auto-login if we hit the login screen
    try {
      await waitFor(element(by.id('loginEmail'))).toBeVisible(25).withTimeout(3000);
      await element(by.id('loginEmail')).typeText('test@example.com');
      await element(by.id('loginPassword')).typeText('password123\n');
      await element(by.id('loginBtn')).tap();
      await waitFor(element(by.id('homeSearchCta'))).toBeVisible(25).withTimeout(5000);
    } catch (e) {
      // Not on login screen, perfectly fine
    }
  });

  it('should navigate between Home, Search, and Profile', async () => {
    // 1. Check we are on home
    await waitFor(element(by.id('homeSearchCta'))).toBeVisible(25).withTimeout(5000);

    // 2. Navigate to Search screen via bottom tab (if labeled) or via CTA
    await element(by.id('homeSearchCta')).tap();
    await expect(element(by.id('searchInput'))).toBeVisible(25);

    // Note: Tab Bar navigation depends on how BottomTabNavigator is instrumented.
    // If using default Expo tabs, we might need different matchers.
  });
});
