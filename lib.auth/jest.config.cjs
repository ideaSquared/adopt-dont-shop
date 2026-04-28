const base = require('../jest.config.base.cjs');
module.exports = {
  ...base,
  moduleNameMapper: {
    '\\.css\\.ts$': '<rootDir>/src/__mocks__/vanillaExtractMock.js',
    '^@adopt-dont-shop/lib\\.api$': '<rootDir>/../lib.api/src/index.ts',
    '^@adopt-dont-shop/lib-api$': '<rootDir>/../lib.api/src/index.ts',
  },
};
