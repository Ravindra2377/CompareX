## E2E / Appium Test Report — CompareX (frontend)

Date: 2026-03-26

Summary
-------
- I attempted to run Detox and inspected the Appium script.
- Environment on this host is missing Android SDK tools and Appium, so tests could not be executed here.

Environment checks performed
---------------------------
- $ANDROID_SDK_ROOT: not set
- $ANDROID_HOME: not set
- adb: not available (not found on PATH)
- Appium process: not running on this host

What I ran and results
----------------------
- Attempted: `npx detox test -c android.emu.debug` from `frontend/`
  - Result: Detox failed immediately with the error:

    DetoxRuntimeError: $ANDROID_SDK_ROOT is not defined, set the path to the SDK installation directory into $ANDROID_SDK_ROOT

    (This happens before any tests execute because Detox needs adb/SDK to locate devices and install test APKs.)

- Checked Appium test script: `frontend/e2e/appium.test.js`
  - The script uses webdriverio remote connected to Appium on 127.0.0.1:4723 and expects an Android device/emulator with package `com.panviravindra.comparez`.
  - It targets elements with accessibility labels: `searchInput`, `searchButton`, `resultsList` — the app already sets these `testID`/`accessibilityLabel` values in code (see `SearchBar.js` and `SearchScreen.js`) so selectors align.

Why tests couldn't run here
--------------------------
- The host lacks Android SDK tooling (adb/emulator). Detox requires Android SDK to build/install/drive the APK.
- Appium is not running (and may not be installed). The Appium test requires an Appium server + emulator/device.

Immediate next steps to run tests locally (copyable)
--------------------------------------------------
1) Install Android SDK and platform tools, then set environment variables (Linux example):

```bash
# adjust the path to your SDK install
export ANDROID_SDK_ROOT="$HOME/Android/Sdk"
export PATH="$ANDROID_SDK_ROOT/emulator:$ANDROID_SDK_ROOT/platform-tools:$PATH"
# persist in ~/.bashrc or ~/.profile
```

2) Create or reuse an AVD that matches `.detoxrc.js` or update `.detoxrc.js` to match your AVD name. Example:

```bash
# install a system image (example)
sdkmanager "system-images;android-36;google_apis;x86_64"

# create the AVD (name must match .detoxrc.js or edit the config)
avdmanager create avd -n Medium_Phone_API_36.1 -k "system-images;android-36;google_apis;x86_64" --force

# start emulator
emulator -avd Medium_Phone_API_36.1 -no-snapshot -no-audio -no-boot-anim &
adb wait-for-device
```

3) Build the debug APKs for Detox (from `frontend`):

```bash
npm run e2e:build:android
```

4) Run Detox tests:

```bash
npm run e2e:test:android
# or directly
npx detox test -c android.emu.debug
```

5) For Appium tests, install/start Appium and run the script:

```bash
# install appium (if needed)
npm install -g appium
appium &

# in another terminal
cd frontend
npm run appium:test
# or
node e2e/appium.test.js
```

Prioritized recommended developments (short actionable tasks)
----------------------------------------------------------
1) High priority (quick wins)
  - Add `frontend/e2e/README.md` with the environment setup and the commands above so contributors can run tests consistently.
  - Ensure `.detoxrc.js` AVD name matches your local/CI AVD or parameterize it via env var (DETOX_AVD_NAME).
  - Configure Detox to collect artifacts (screenshots, logs, video) to a artifacts folder on failure: this helps debugging CI flakes.

2) Medium priority
  - Stabilize tests: centralize `testID` constants (a file `e2e/testIDs.js`) and replace string literals to reduce brittleness.
  - Increase/adjust timeouts (per-action waits) and use `waitFor` consistently in Detox tests.
  - Add smoke e2e tests that run in CI: app launch, search flow, results page visible.

3) Long term
  - Build a reproducible CI environment for Detox runs (self-hosted runner with Android SDK + emulator or use device cloud). Create a GitHub Actions template that boots an emulator and runs Detox, or use a Docker image specifically prepared for Detox (special setup required).
  - Add artifact upload (S3/GCS) for failed runs so developers can inspect videos/screenshots/logs.

Notes and caveats
-----------------
- Running Detox and Appium reliably in CI requires an environment with Android SDK and a working emulator. Hosted GitHub runners can be used but require careful emulator setup (GPU/KVM optional) and longer startup times.
- For iOS Detox runs you need macOS with Xcode; `.detoxrc.js` contains placeholders for YOUR_APP and will need adjustment.

Files I created/edited
----------------------
- Edited `frontend/package.json` to add npm scripts to simplify e2e/Appium runs.
- Created this report: `frontend/e2e/TEST_REPORT.md`

If you want, I can:
- Create the `frontend/e2e/README.md` with the step-by-step commands and troubleshooting tips.
- Add Detox artifact configuration (enable screenshots/video on failure) and a small GitHub Actions workflow template to run smoke e2e tests.
- Attempt to execute Appium here if you install Appium and an emulator on this machine (I can guide step-by-step).

---
End of report.
