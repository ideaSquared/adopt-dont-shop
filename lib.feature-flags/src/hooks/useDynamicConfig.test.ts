const useContextMock = jest.fn();

jest.mock('react', () => {
  const actual = jest.requireActual('react');
  return {
    ...actual,
    useContext: (...args: unknown[]) => useContextMock(...args),
  };
});

jest.mock('@statsig/react-bindings', () => ({
  StatsigContext: { _statsigContextMarker: true },
}));

import { useConfigValue, useDynamicConfig } from './useDynamicConfig';

type FakeConfig = {
  value: Record<string, unknown>;
  get: <T>(key: string, fallback: T) => T;
};

const buildClient = (configs: Record<string, FakeConfig | undefined>) => ({
  getDynamicConfig: (name: string) => configs[name],
});

describe('useDynamicConfig', () => {
  let warnSpy: jest.SpyInstance;

  beforeEach(() => {
    warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
    useContextMock.mockReset();
  });

  afterEach(() => {
    warnSpy.mockRestore();
  });

  it('returns the config value from the Statsig client', () => {
    const config: FakeConfig = {
      value: { max_applications_per_user: 10 },
      get: (k, f) => (config.value[k] === undefined ? f : (config.value[k] as never)),
    };
    useContextMock.mockReturnValue({ client: buildClient({ application_settings: config }) });

    expect(useDynamicConfig('application_settings')).toEqual({ max_applications_per_user: 10 });
  });

  it('returns null and warns when the client is not initialized', () => {
    useContextMock.mockReturnValue({ client: null });

    expect(useDynamicConfig('whatever')).toBeNull();
    expect(warnSpy).toHaveBeenCalled();
  });
});

describe('useConfigValue', () => {
  let warnSpy: jest.SpyInstance;

  beforeEach(() => {
    warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
    useContextMock.mockReset();
  });

  afterEach(() => {
    warnSpy.mockRestore();
  });

  it('returns the keyed config value when present', () => {
    const config: FakeConfig = {
      value: { max_applications_per_user: 7 },
      get: (k, f) => (config.value[k] === undefined ? f : (config.value[k] as never)),
    };
    useContextMock.mockReturnValue({ client: buildClient({ application_settings: config }) });

    expect(useConfigValue('application_settings', 'max_applications_per_user', 5)).toBe(7);
  });

  it('returns the supplied fallback when the key is missing', () => {
    const config: FakeConfig = { value: {}, get: <T>(_: string, f: T): T => f };
    useContextMock.mockReturnValue({ client: buildClient({ application_settings: config }) });

    expect(useConfigValue('application_settings', 'missing', 'default-value')).toBe(
      'default-value'
    );
  });

  it('returns the supplied fallback and warns when the client is not initialized', () => {
    useContextMock.mockReturnValue({ client: null });

    expect(useConfigValue('any', 'k', 'fallback')).toBe('fallback');
    expect(warnSpy).toHaveBeenCalled();
  });
});
