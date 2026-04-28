const base = require('../jest.config.base.cjs');
module.exports = {
  ...base,
  setupFilesAfterEnv: ['<rootDir>/src/setupTests.ts'],
  moduleNameMapper: {
    '\\.css\\.ts$': '<rootDir>/src/__mocks__/vanillaExtractMock.js',
    '\\.(css|less|scss|sass)$': '<rootDir>/src/__mocks__/fileMock.js',
    '\\.(jpg|jpeg|png|gif|eot|otf|webp|svg|ttf|woff|woff2|mp4|webm|wav|mp3|m4a|aac|oga)$':
      '<rootDir>/src/__mocks__/fileMock.js',
  },
  collectCoverageFrom: [
    'src/**/*.{ts,tsx}',
    '!src/**/*.d.ts',
    '!src/index.ts',
    '!src/types/**/*',
    '!src/styles/**/*',
  ],
};
