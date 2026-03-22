module.exports = {
  transform: {
    "^.+\\.[jt]sx?$": "babel-jest",
  },
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
  moduleFileExtensions: ["js", "jsx", "json"],
  testTimeout: 10000,
};
