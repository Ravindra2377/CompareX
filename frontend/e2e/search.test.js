describe('CompareZ Search Flow', () => {
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

  it('should navigate to Search and see the search input', async () => {
    await element(by.id('homeSearchCta')).tap();
    await new Promise(resolve => setTimeout(resolve, 1000));

    await expect(element(by.id('searchInput'))).toBeVisible();
  });

  it('should display suggestion chips on Search screen', async () => {
    await element(by.id('nav-search')).tap();
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Verify at least one suggestion is visible
    await expect(element(by.id('searchSuggestion_Eggs'))).toBeVisible();
    await expect(element(by.id('searchSuggestion_Milk'))).toBeVisible();
  });

  it('should search for a product and show results', async () => {
    await element(by.id('homeSearchCta')).tap();

    // Type "milk" into the search input
    await waitFor(element(by.id('searchInput')))
      .toBeVisible()
      .withTimeout(2000);
    await element(by.id('searchInput')).typeText('milk\n');

    // Verify results list appears
    await waitFor(element(by.id('resultsList')))
      .toBeVisible()
      .withTimeout(30000); // 30s timeout for scraping

    // Verify at least one product card exists
    await expect(element(by.id('productCard_best'))).toExist();
  });

  it('should allow clicking a suggestion chip', async () => {
    await element(by.id('homeSearchCta')).tap();
    await new Promise(resolve => setTimeout(resolve, 500));

    const suggestion = 'Eggs';
    await waitFor(element(by.id(`searchSuggestion_${suggestion}`)))
      .toBeVisible()
      .withTimeout(2000);

    await element(by.id(`searchSuggestion_${suggestion}`)).tap();

    // Results should start appearing
    await waitFor(element(by.id('resultsList')))
      .toBeVisible()
      .withTimeout(30000);
  });

  it('should type in search input and update the field', async () => {
    await element(by.id('nav-search')).tap();
    await new Promise(resolve => setTimeout(resolve, 1000));

    await element(by.id('searchInput')).tap();
    await element(by.id('searchInput')).typeText('bread');

    // The input should contain the typed text
    await expect(element(by.id('searchInput'))).toHaveText('bread');
  });

  it('should show search input after navigating via category pill', async () => {
    // Tap the Milk category pill
    await element(by.id('homeCategoryPill_milk')).tap();
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Should be on Search screen with prefilled query
    await expect(element(by.id('searchInput'))).toBeVisible();
  });

  it('should show empty suggestion state before any search', async () => {
    await element(by.id('nav-search')).tap();
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Search input visible but no results list yet
    await expect(element(by.id('searchInput'))).toBeVisible();

    // Suggestions should be displayed
    await expect(element(by.id('searchSuggestion_Rice'))).toBeVisible();
  });
});
