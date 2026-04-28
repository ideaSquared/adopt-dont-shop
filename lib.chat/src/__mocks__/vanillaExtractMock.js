// Mock for Vanilla Extract .css.ts files in Jest
// style() returns a string, recipe() returns a function returning a string,
// styleVariants() returns an object with string values.
const handler = {
  get: (target, prop) => {
    if (prop === '__esModule') return true;
    // For recipe variants (functions), return a callable that returns ''
    return new Proxy(() => '', handler);
  },
  apply: () => '',
};

module.exports = new Proxy({}, handler);
