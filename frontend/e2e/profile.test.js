describe('CompareZ Profile Screen', () => {
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

  it('should display Profile screen with user info', async () => {
    // Navigate to Profile tab
    await element(by.id('nav-profile')).tap();
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Verify Profile header and user info
    await expect(element(by.text('Profile'))).toBeVisible();
    await expect(element(by.text('User'))).toBeVisible();
    await expect(element(by.text('user@example.com'))).toBeVisible();
  });

  it('should display stats section', async () => {
    await element(by.id('nav-profile')).tap();
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Verify stats
    await expect(element(by.text('Searches'))).toBeVisible();
    await expect(element(by.text('Saved'))).toBeVisible();
    await expect(element(by.text('Savings'))).toBeVisible();
  });

  it('should display Delivery Location section', async () => {
    await element(by.id('nav-profile')).tap();
    await new Promise(resolve => setTimeout(resolve, 1000));

    await expect(element(by.text('Delivery Location'))).toBeVisible();
  });

  it('should display menu items', async () => {
    await element(by.id('nav-profile')).tap();
    await new Promise(resolve => setTimeout(resolve, 1000));

    await expect(element(by.text('Link Accounts'))).toBeVisible();
    await expect(element(by.text('Price Alerts'))).toBeVisible();
    await expect(element(by.text('Search History'))).toBeVisible();
    await expect(element(by.text('Settings'))).toBeVisible();
  });

  it('should have a visible Sign Out button', async () => {
    await element(by.id('nav-profile')).tap();
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Scroll down to find logout
    await waitFor(element(by.id('profileLogoutBtn')))
      .toBeVisible()
      .whileElement(by.type('android.widget.ScrollView'))
      .scroll(300, 'down');

    await expect(element(by.id('profileLogoutBtn'))).toBeVisible();
    await expect(element(by.text('Sign Out'))).toBeVisible();
  });
});
