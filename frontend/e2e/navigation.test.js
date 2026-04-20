describe('CompareZ Navigation Flow', () => {
  beforeAll(async () => {
    await device.launchApp({ newInstance: true });
    await device.disableSynchronization();
    await new Promise(resolve => setTimeout(resolve, 5000));
  });

  beforeEach(async () => {
    await device.launchApp({ newInstance: true });
    await device.disableSynchronization();
    await new Promise(resolve => setTimeout(resolve, 5000));
  });

  it('should start on Home tab with hero content', async () => {
    await expect(element(by.id('homeSearchCta'))).toBeVisible();
    await expect(element(by.id('homeHeroTitle'))).toBeVisible();
  });

  it('should navigate to Search tab via bottom nav', async () => {
    await element(by.id('nav-search')).tap();
    await new Promise(resolve => setTimeout(resolve, 1000));

    await expect(element(by.id('searchInput'))).toBeVisible();
  });

  it('should navigate to Wishlist tab via bottom nav', async () => {
    await element(by.id('nav-wishlist')).tap();
    await new Promise(resolve => setTimeout(resolve, 1000));

    await expect(element(by.text('Wishlist'))).toBeVisible();
    await expect(element(by.id('wishlist-empty-state'))).toBeVisible();
  });

  it('should navigate to Profile tab via bottom nav', async () => {
    await element(by.id('nav-profile')).tap();
    await new Promise(resolve => setTimeout(resolve, 1000));

    await expect(element(by.text('Profile'))).toBeVisible();
    await expect(element(by.text('User'))).toBeVisible();
  });

  it('should navigate back to Home tab via bottom nav', async () => {
    // Go to Profile first
    await element(by.id('nav-profile')).tap();
    await new Promise(resolve => setTimeout(resolve, 500));

    // Navigate back to Home
    await element(by.id('nav-home')).tap();
    await new Promise(resolve => setTimeout(resolve, 1000));

    await expect(element(by.id('homeSearchCta'))).toBeVisible();
  });

  it('should navigate Home → Search via "Start Comparing" CTA', async () => {
    await element(by.id('homeSearchCta')).tap();
    await new Promise(resolve => setTimeout(resolve, 1000));

    await expect(element(by.id('searchInput'))).toBeVisible();
  });

  it('should navigate via category pill from Home to Search', async () => {
    // Tap a category pill (e.g., Eggs)
    await element(by.id('homeCategoryPill_eggs')).tap();
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Should be on Search screen
    await expect(element(by.id('searchInput'))).toBeVisible();
  });

  it('should navigate from Wishlist empty state CTA to Search', async () => {
    await element(by.id('nav-wishlist')).tap();
    await new Promise(resolve => setTimeout(resolve, 1000));

    await element(by.id('wishlist-start-searching')).tap();
    await new Promise(resolve => setTimeout(resolve, 1000));

    await expect(element(by.id('searchInput'))).toBeVisible();
  });

  it('should cycle through all tabs without crashing', async () => {
    const tabs = ['nav-home', 'nav-search', 'nav-wishlist', 'nav-profile'];

    for (const tab of tabs) {
      await element(by.id(tab)).tap();
      await new Promise(resolve => setTimeout(resolve, 500));
    }

    // End on Profile, verify it displays
    await expect(element(by.text('Profile'))).toBeVisible();
  });
});
