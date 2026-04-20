describe('CompareZ Auth Flow', () => {
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

  it('should launch app and land on Home (auto-login bypass)', async () => {
    // The Detox auto-login bypass in AuthContext should skip Login
    await expect(element(by.id('homeSearchCta'))).toBeVisible();
    await expect(element(by.id('homeHeroTitle'))).toBeVisible();
  });

  it('should logout and show Login screen', async () => {
    // Navigate to Profile tab
    await element(by.id('nav-profile')).tap();
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Scroll down and tap Sign Out
    await waitFor(element(by.id('profileLogoutBtn')))
      .toBeVisible()
      .whileElement(by.type('android.widget.ScrollView'))
      .scroll(300, 'down');

    await element(by.id('profileLogoutBtn')).tap();
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Should now see Login screen
    await expect(element(by.id('login-email'))).toBeVisible();
    await expect(element(by.id('login-password'))).toBeVisible();
    await expect(element(by.id('login-button'))).toBeVisible();
  });

  it('should show Login form elements correctly', async () => {
    // Navigate to Profile and logout
    await element(by.id('nav-profile')).tap();
    await new Promise(resolve => setTimeout(resolve, 1000));

    await waitFor(element(by.id('profileLogoutBtn')))
      .toBeVisible()
      .whileElement(by.type('android.widget.ScrollView'))
      .scroll(300, 'down');

    await element(by.id('profileLogoutBtn')).tap();
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Verify login form
    await expect(element(by.id('login-email'))).toBeVisible();
    await element(by.id('login-email')).typeText('test@example.com');
    await expect(element(by.id('login-password'))).toBeVisible();
    await element(by.id('login-password')).typeText('password123');

    // Login button should be visible
    await expect(element(by.id('login-button'))).toBeVisible();
  });

  it('should navigate from Login to Register and back', async () => {
    // Logout
    await element(by.id('nav-profile')).tap();
    await new Promise(resolve => setTimeout(resolve, 1000));

    await waitFor(element(by.id('profileLogoutBtn')))
      .toBeVisible()
      .whileElement(by.type('android.widget.ScrollView'))
      .scroll(300, 'down');

    await element(by.id('profileLogoutBtn')).tap();
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Tap "Sign Up" link on Login screen
    await expect(element(by.text('Sign Up'))).toBeVisible();
    await element(by.text('Sign Up')).tap();
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Should see Register screen
    await expect(element(by.id('register-email'))).toBeVisible();
    await expect(element(by.id('register-password'))).toBeVisible();
    await expect(element(by.id('register-confirm'))).toBeVisible();
    await expect(element(by.id('register-button'))).toBeVisible();

    // Navigate back to Login
    await element(by.id('register-signin-link')).tap();
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Should be back on Login
    await expect(element(by.id('login-email'))).toBeVisible();
  });
});
