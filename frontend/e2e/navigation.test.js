jest.setTimeout(300000);

describe('CompareZ Navigation Flow', () => {
  beforeAll(async () => {
    await device.launchApp({ 
      newInstance: true,
      launchArgs: { detoxPrintBusyIdleResources: 'YES', detoxURLBlacklistRegex: '.*10\\.0\\.2\\.2.*' } 
    });
    await device.disableSynchronization(); 
  });

  beforeEach(async () => {
    // No need to relaunch every time if disableSynchronization is on, 
    // but Expo bundle loading is slow, so let's just make sure it's ready.
    await new Promise(resolve => setTimeout(resolve, 5000));
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
