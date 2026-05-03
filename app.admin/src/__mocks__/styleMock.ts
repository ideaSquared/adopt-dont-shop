const makeProxy = (): unknown => {
  const fn = (..._args: unknown[]) => '';
  return new Proxy(fn, {
    get: (_target, key) => {
      if (key === Symbol.toPrimitive || key === 'toString' || key === 'valueOf') {
        return () => '';
      }
      return makeProxy();
    },
    apply: () => '',
  });
};

export default makeProxy();
