// jest.mock factories must only reference variables whose names begin with
// "mock" — see useFeatureGate.test.ts for the rationale.
const mockUseContext = vi.fn();

vi.mock('react', async () => {
  const actual = await vi.importActual('react');
  return {
    ...(actual as Record<string, unknown>),
    useContext: (...args: unknown[]) => mockUseContext(...args),
  };
});

vi.mock('@statsig/react-bindings', () => ({
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
  let warnSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    mockUseContext.mockReset();
  });

  afterEach(() => {
    warnSpy.mockRestore();
  });

  it('returns the config value from the Statsig client', () => {
    const config: FakeConfig = {
      value: { max_applications_per_user: 10 },
      get: (k, f) => (config.value[k] === undefined ? f : (config.value[k] as never)),
    };
    mockUseContext.mockReturnValue({ client: buildClient({ application_settings: config }) });

    expect(useDynamicConfig('application_settings')).toEqual({ max_applications_per_user: 10 });
  });

  it('returns null and warns when the client is not initialized', () => {
    mockUseContext.mockReturnValue({ client: null });

    expect(useDynamicConfig('whatever')).toBeNull();
    expect(warnSpy).toHaveBeenCalled();
  });
});

describe('useConfigValue', () => {
  let warnSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    mockUseContext.mockReset();
  });

  afterEach(() => {
    warnSpy.mockRestore();
  });

  it('returns the keyed config value when present', () => {
    const config: FakeConfig = {
      value: { max_applications_per_user: 7 },
      get: (k, f) => (config.value[k] === undefined ? f : (config.value[k] as never)),
    };
    mockUseContext.mockReturnValue({ client: buildClient({ application_settings: config }) });

    expect(useConfigValue('application_settings', 'max_applications_per_user', 5)).toBe(7);
  });

  it('returns the supplied fallback when the key is missing', () => {
    const config: FakeConfig = { value: {}, get: <T>(_: string, f: T): T => f };
    mockUseContext.mockReturnValue({ client: buildClient({ application_settings: config }) });

    expect(useConfigValue('application_settings', 'missing', 'default-value')).toBe(
      'default-value'
    );
  });

  it('returns the supplied fallback and warns when the client is not initialized', () => {
    mockUseContext.mockReturnValue({ client: null });

    expect(useConfigValue('any', 'k', 'fallback')).toBe('fallback');
    expect(warnSpy).toHaveBeenCalled();
  });
});
