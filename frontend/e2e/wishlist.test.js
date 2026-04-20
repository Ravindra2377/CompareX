describe('CompareZ Wishlist Screen', () => {
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

  it('should display empty state on Wishlist tab', async () => {
    // Navigate to Wishlist tab
    await element(by.id('nav-wishlist')).tap();
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Verify Wishlist header
    await expect(element(by.text('Wishlist'))).toBeVisible();

    // Verify empty state
    await expect(element(by.id('wishlist-empty-state'))).toBeVisible();
    await expect(element(by.text('No saved items'))).toBeVisible();
    await expect(element(by.text('Heart products to track prices'))).toBeVisible();
  });

  it('should show "Start Searching" CTA in empty state', async () => {
    await element(by.id('nav-wishlist')).tap();
    await new Promise(resolve => setTimeout(resolve, 1000));

    await expect(element(by.id('wishlist-start-searching'))).toBeVisible();
  });

  it('should navigate to Search when tapping "Start Searching"', async () => {
    await element(by.id('nav-wishlist')).tap();
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Tap "Start Searching"
    await element(by.id('wishlist-start-searching')).tap();
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Should now be on Search screen
    await expect(element(by.id('searchInput'))).toBeVisible();
  });

  it('should show saved products count as zero', async () => {
    await element(by.id('nav-wishlist')).tap();
    await new Promise(resolve => setTimeout(resolve, 1000));

    await expect(element(by.text('0 saved products'))).toBeVisible();
  });
});
