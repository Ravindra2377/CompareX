describe('CompareZ Search Flow', () => {
  beforeAll(async () => {
    await device.launchApp();
  });

  beforeEach(async () => {
    await device.reloadReactNative();
  });

  it('should search for a product and show results', async () => {
    // 1. Start from Home and click the search CTA
    await expect(element(by.id('homeSearchCta'))).toBeVisible();
    await element(by.id('homeSearchCta')).tap();

    // 2. Type "milk" into the search input
    await waitFor(element(by.id('searchInput')))
      .toBeVisible()
      .withTimeout(2000);
    await element(by.id('searchInput')).typeText('milk\n'); // \n handles the "return" key

    // 3. Verify results list appears
    await waitFor(element(by.id('resultsList')))
      .toBeVisible()
      .withTimeout(10000); // 10s timeout for scraping
    
    // 4. Verify at least one product card exists (using best platform generic ID)
    await expect(element(by.id('productCard_best'))).toExist();
  });

  it('should allow clicking a suggestion chip', async () => {
    await element(by.id('homeSearchCta')).tap();
    
    // Wait for suggestions
    const suggestion = 'Eggs';
    await waitFor(element(by.id(`searchSuggestion_${suggestion}`)))
      .toBeVisible()
      .withTimeout(2000);
      
    await element(by.id(`searchSuggestion_${suggestion}`)).tap();
    
    // Results should start appearing
    await waitFor(element(by.id('resultsList')))
      .toBeVisible()
      .withTimeout(10000);
  });
});
