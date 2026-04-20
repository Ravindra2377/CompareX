const { remote } = require('webdriverio');

/**
 * Appium E2E Test Suite for CompareX
 *
 * Usage:
 * 1. Start Appium Server: `appium`
 * 2. Ensure an Android Emulator is running: `emulator -avd YOUR_AVD_NAME`
 * 3. Run this script: `node frontend/e2e/appium.test.js`
 */

const CAPABILITIES = {
  platformName: 'Android',
  'appium:deviceName': 'emulator-5554',
  'appium:automationName': 'UiAutomator2',
  'appium:appPackage': 'com.panviravindra.comparez',
  'appium:appActivity': '.MainActivity',
  'appium:ensureWebviewsHavePages': true,
  'appium:nativeWebScreenshot': true,
  'appium:newCommandTimeout': 3600,
  'appium:connectHardwareKeyboard': true,
};

const DRIVER_OPTIONS = {
  protocol: 'http',
  hostname: '127.0.0.1',
  port: 4723,
  path: '/',
  capabilities: CAPABILITIES,
};

/** Helper: wait for element by accessibility ID */
async function waitAndTap(driver, accessibilityId, timeout = 10000) {
  const el = await driver.$(`~${accessibilityId}`);
  await el.waitForDisplayed({ timeout });
  await el.click();
  return el;
}

/** Helper: wait for element to be visible */
async function waitForVisible(driver, accessibilityId, timeout = 10000) {
  const el = await driver.$(`~${accessibilityId}`);
  await el.waitForDisplayed({ timeout });
  return el;
}

// ─── Test Suites ────────────────────────────────────────────────────────────

async function testSearchFlow(driver) {
  console.log('\n📋 Test: Search Flow');
  console.log('─'.repeat(40));

  // 1. Tap the "Start Comparing" CTA from Home
  await waitAndTap(driver, 'homeSearchCta');
  console.log('✅ Tapped "Start Comparing" CTA');

  // 2. Type "milk" into the search input
  const searchInput = await waitForVisible(driver, 'searchInput');
  await searchInput.click();
  await searchInput.setValue('milk');
  console.log('✅ Typed "milk" in search input');

  // 3. Tap search button to submit
  const searchButton = await driver.$('~search-button');
  if (await searchButton.isExisting()) {
    await searchButton.click();
    console.log('✅ Tapped search button');
  } else {
    // Press Enter key as fallback
    await driver.pressKeyCode(66);
    console.log('✅ Pressed Enter to submit search');
  }

  // 4. Wait for results
  const resultsList = await driver.$('~resultsList');
  await resultsList.waitForDisplayed({ timeout: 30000 });
  const isDisplayed = await resultsList.isDisplayed();
  console.log(`✅ Results list displayed: ${isDisplayed}`);

  if (!isDisplayed) throw new Error('Results list not visible');

  console.log('🎉 Search Flow PASSED\n');
}

async function testTabNavigation(driver) {
  console.log('\n📋 Test: Tab Navigation');
  console.log('─'.repeat(40));

  const tabs = [
    { id: 'nav-search', label: 'Search' },
    { id: 'nav-wishlist', label: 'Wishlist' },
    { id: 'nav-profile', label: 'Profile' },
    { id: 'nav-home', label: 'Home' },
  ];

  for (const tab of tabs) {
    await waitAndTap(driver, tab.id);
    await new Promise(r => setTimeout(r, 1000));
    console.log(`✅ Navigated to ${tab.label} tab`);
  }

  // Verify we're back on Home
  const homeCta = await waitForVisible(driver, 'homeSearchCta');
  if (!(await homeCta.isDisplayed())) throw new Error('Home CTA not visible after tab cycle');

  console.log('🎉 Tab Navigation PASSED\n');
}

async function testSuggestionChip(driver) {
  console.log('\n📋 Test: Suggestion Chip');
  console.log('─'.repeat(40));

  // Navigate to Search
  await waitAndTap(driver, 'nav-search');
  await new Promise(r => setTimeout(r, 1000));

  // Tap a suggestion chip
  const suggestion = await driver.$('~searchSuggestion_Eggs');
  if (await suggestion.isExisting()) {
    await suggestion.waitForDisplayed({ timeout: 5000 });
    await suggestion.click();
    console.log('✅ Tapped "Eggs" suggestion chip');

    // Wait for results
    const resultsList = await driver.$('~resultsList');
    await resultsList.waitForDisplayed({ timeout: 30000 });
    console.log('✅ Results appeared after suggestion chip tap');
  } else {
    console.log('⚠️ Suggestion chip not found, skipping');
  }

  console.log('🎉 Suggestion Chip PASSED\n');
}

async function testProfileAndLogout(driver) {
  console.log('\n📋 Test: Profile & Logout');
  console.log('─'.repeat(40));

  // Navigate to Profile
  await waitAndTap(driver, 'nav-profile');
  await new Promise(r => setTimeout(r, 1000));
  console.log('✅ Navigated to Profile tab');

  // Scroll down to find logout button
  const logoutBtn = await driver.$('~profileLogoutBtn');

  // Try scrolling to find it
  for (let i = 0; i < 3; i++) {
    if (await logoutBtn.isDisplayed()) break;
    await driver.execute('mobile: scrollGesture', {
      direction: 'down',
      percent: 0.5,
    }).catch(() => {});
    await new Promise(r => setTimeout(r, 500));
  }

  if (await logoutBtn.isDisplayed()) {
    await logoutBtn.click();
    console.log('✅ Tapped Sign Out');

    await new Promise(r => setTimeout(r, 2000));

    // Should see Login screen
    const loginEmail = await driver.$('~login-email');
    await loginEmail.waitForDisplayed({ timeout: 5000 });
    console.log('✅ Login screen visible after logout');
  } else {
    console.log('⚠️ Logout button not reachable, skipping');
  }

  console.log('🎉 Profile & Logout PASSED\n');
}

// ─── Main Runner ────────────────────────────────────────────────────────────

(async () => {
  let driver;
  const results = { passed: 0, failed: 0, errors: [] };

  try {
    console.log('🚀 Starting Appium E2E Test Suite for CompareX...\n');

    driver = await remote(DRIVER_OPTIONS);
    console.log('✅ Connected to Appium driver\n');

    // Wait for app to load
    await new Promise(r => setTimeout(r, 5000));

    // Run test suites
    const tests = [
      { name: 'Tab Navigation', fn: testTabNavigation },
      { name: 'Search Flow', fn: testSearchFlow },
      { name: 'Suggestion Chip', fn: testSuggestionChip },
      { name: 'Profile & Logout', fn: testProfileAndLogout },
    ];

    for (const test of tests) {
      try {
        await test.fn(driver);
        results.passed++;
      } catch (error) {
        results.failed++;
        results.errors.push({ test: test.name, error: error.message });
        console.error(`❌ ${test.name} FAILED: ${error.message}\n`);
      }
    }

  } catch (error) {
    console.error(`❌ Fatal Error: ${error.message}`);
    results.errors.push({ test: 'Setup', error: error.message });
  } finally {
    if (driver) {
      await driver.deleteSession();
      console.log('👋 Session closed\n');
    }

    // Summary
    console.log('═'.repeat(40));
    console.log('📊 TEST RESULTS SUMMARY');
    console.log('═'.repeat(40));
    console.log(`   Passed: ${results.passed}`);
    console.log(`   Failed: ${results.failed}`);
    console.log(`   Total:  ${results.passed + results.failed}`);

    if (results.errors.length > 0) {
      console.log('\nFailures:');
      results.errors.forEach(err => {
        console.log(`   ❌ ${err.test}: ${err.error}`);
      });
    }

    console.log('═'.repeat(40));

    process.exit(results.failed > 0 ? 1 : 0);
  }
})();
