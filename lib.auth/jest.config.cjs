const base = require('../../jest.config.base.cjs');
module.exports = {
  ...base,
  moduleNameMapper: {
    '^@adopt-dont-shop/lib\\.api$': '<rootDir>/../lib.api/src/index.ts',
    '^@adopt-dont-shop/lib-api$': '<rootDir>/../lib.api/src/index.ts',
  },
};
