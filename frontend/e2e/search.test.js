describe('CompareZ Search Flow', () => {
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

  it('should search for a product and show results', async () => {
    // 1. Start from Home and click the search CTA
    await waitFor(element(by.id('homeSearchCta'))).toBeVisible(25).withTimeout(5000);
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
    await waitFor(element(by.id('homeSearchCta'))).toBeVisible(25).withTimeout(5000);
    await element(by.id('homeSearchCta')).tap();
    
    // Wait for suggestions
    const suggestion = 'Eggs';
    await waitFor(element(by.id(`searchSuggestion_${suggestion}`)))
      .toBeVisible(25)
      .withTimeout(2000);
      
    await element(by.id(`searchSuggestion_${suggestion}`)).tap();
    
    // Results should start appearing
    await waitFor(element(by.id('resultsList')))
      .toBeVisible(25)
      .withTimeout(10000);
  });
});
