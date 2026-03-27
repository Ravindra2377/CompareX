// Lightweight E2E configuration used only in development (Metro/Expo).
// This file enables test automation to bypass authentication for local E2E runs.
// Do NOT enable in production builds.

module.exports = {
  // When true and running a development build, the app will auto-set a fake
  // user token so navigation lands on the main app tabs instead of login.
  AUTO_LOGIN: true,

  // Token value placed into AuthContext; can be any non-null string.
  TOKEN: "E2E_AUTOMATION_TOKEN",
};
