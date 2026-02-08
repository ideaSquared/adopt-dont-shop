module.exports = {
  "preset": "ts-jest",
  "testEnvironment": "jsdom",
  "roots": [
    "<rootDir>/src"
  ],
  "testMatch": [
    "**/__tests__/**/*.test.ts",
    "**/?(*.)+(spec|test).ts"
  ],
  "transform": {
    "^.+\\.ts$": "ts-jest"
  },
  "setupFilesAfterEnv": [
    "<rootDir>/src/test-utils/setup-tests.ts"
  ],
  "collectCoverageFrom": [
    "src/**/*.ts",
    "!src/**/*.d.ts",
    "!src/**/*.test.ts",
    "!src/**/*.spec.ts",
    "!src/test-utils/**"
  ],
  "coverageDirectory": "coverage",
  "coverageReporters": [
    "text",
    "lcov",
    "html"
  ],
  "moduleFileExtensions": [
    "ts",
    "js",
    "json"
  ],
  "testTimeout": 10000,
  "moduleNameMapper": {
    "^@adopt-dont-shop/lib-api$": "<rootDir>/../lib.api/src/index.ts",
    "^@adopt-dont-shop/lib\\.api$": "<rootDir>/../lib.api/src/index.ts"
  }
};