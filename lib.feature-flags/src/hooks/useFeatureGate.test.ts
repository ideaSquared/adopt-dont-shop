// jest.mock factories must only reference variables whose names begin with
// "mock" — Jest hoists the mock above the imports but NOT the local
// declarations, so non-mock-prefixed variables would be undefined at the
// time the factory runs.
const mockUseContext = jest.fn();

jest.mock('react', () => {
  const actual = jest.requireActual('react');
  return {
    ...actual,
    useContext: (...args: unknown[]) => mockUseContext(...args),
  };
});

jest.mock('@statsig/react-bindings', () => ({
  StatsigContext: { _statsigContextMarker: true },
}));

import { useFeatureGate } from './useFeatureGate';

describe('useFeatureGate', () => {
  let warnSpy: jest.SpyInstance;

  beforeEach(() => {
    warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
    mockUseContext.mockReset();
  });

  afterEach(() => {
    warnSpy.mockRestore();
  });

  it('returns the gate value from the Statsig client when present', () => {
    mockUseContext.mockReturnValue({
      client: {
        checkGate: (name: string) => name === 'chat_enabled',
      },
    });

    expect(useFeatureGate('chat_enabled')).toEqual({ value: true });
    expect(useFeatureGate('beta_search')).toEqual({ value: false });
    expect(warnSpy).not.toHaveBeenCalled();
  });

  it('returns false and warns when the Statsig client is not initialized', () => {
    mockUseContext.mockReturnValue({ client: null });

    expect(useFeatureGate('any_gate')).toEqual({ value: false });
    expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('any_gate'));
  });
});
