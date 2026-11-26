module.exports = {
  haste: {
    defaultPlatform: "ios",
    platforms: ["android", "ios", "native"],
  },
  resolver: require.resolve("react-native/jest/resolver.js"),
  transform: {
    "^.+\\.[jt]sx?$": "babel-jest",
    "^.+\\.(bmp|gif|jpg|jpeg|mp4|png|psd|svg|webp|ttf|otf)$": require.resolve(
      "react-native/jest/assetFileTransformer.js",
    ),
  },
  transformIgnorePatterns: [
    "node_modules/(?!((jest-)?react-native|@react-native(-community)?)|expo(nent)?|@expo(nent)?/.*|@expo-google-fonts/.*|react-navigation|@react-navigation/.*|@testing-library/.*)",
  ],
  setupFilesAfterEnv: ["<rootDir>/jest.setup.js"],
  testEnvironment: "node",
  moduleNameMapper: {
    "^@/(.*)$": "<rootDir>/src/$1",
  },
  collectCoverageFrom: [
    "services/**/*.js",
    "components/**/*.js",
    "config/**/*.js",
    "!**/node_modules/**",
    "!**/vendor/**",
  ],
  testMatch: ["**/__tests__/**/*.js", "**/?(*.)+(spec|test).js"],
  testPathIgnorePatterns: ["<rootDir>/e2e/"],
  moduleFileExtensions: [
    "ios.js",
    "android.js",
    "native.js",
    "js",
    "jsx",
    "json",
    "ios.ts",
    "android.ts",
    "native.ts",
    "ts",
    "ios.tsx",
    "android.tsx",
    "native.tsx",
    "tsx",
  ],
  testTimeout: 10000,
};
