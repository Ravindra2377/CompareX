const { remote } = require('webdriverio');

/**
 * Appium Search Flow Test for CompareX
 * 
 * Usage:
 * 1. Start Appium Server: `appium`
 * 2. Ensure an Android Emulator is running: `emulator -avd YOUR_AVD_NAME`
 * 3. Run this script: `node frontend/e2e/appium.test.js`
 */

(async () => {
  const driver = await remote({
    protocol: 'http',
    hostname: '127.0.0.1',
    port: 4723,
    path: '/',
    capabilities: {
      platformName: 'Android',
      'appium:deviceName': 'emulator-5554',
      'appium:automationName': 'UiAutomator2',
      'appium:appPackage': 'com.panviravindra.comparez',
      'appium:appActivity': '.MainActivity', // Standard for Expo/RN
      'appium:ensureWebviewsHavePages': true,
      'appium:nativeWebScreenshot': true,
      'appium:newCommandTimeout': 3600,
      'appium:connectHardwareKeyboard': true
    }
  });

  try {
    console.log('🚀 Starting Search Flow Test...');

    // Tap search input
    const searchInput = await driver.$('~searchInput');
    await searchInput.waitForDisplayed({ timeout: 10000 });
    await searchInput.click();
    console.log('✅ Tapped Search Input');

    // Type "milk"
    await searchInput.setValue('milk');
    console.log('✅ Typed "milk"');

    // Tap search button
    const searchButton = await driver.$('~searchButton');
    await searchButton.click();
    console.log('✅ Tapped Search Button');

    // Verify results list is displayed
    const resultsList = await driver.$('~resultsList');
    await resultsList.waitForDisplayed({ timeout: 15000 });
    const isDisplayed = await resultsList.isDisplayed();
    console.log(`✅ Results List Displayed: ${isDisplayed}`);

    if (isDisplayed) {
      console.log('🎉 Test Passed!');
    } else {
      console.log('❌ Test Failed: Results not found');
    }

  } catch (error) {
    console.error('❌ Test Error:', error.message);
  } finally {
    await driver.deleteSession();
    console.log('👋 Session closed');
  }
})();
