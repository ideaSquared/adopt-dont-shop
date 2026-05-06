// Tests use jest.mock to swap React.useContext, so the hook can be invoked
// directly as a plain function in node — no React renderer required.

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

import { useFeatureGate } from './useFeatureGate';

describe('useFeatureGate', () => {
  let warnSpy: jest.SpyInstance;

  beforeEach(() => {
    warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
    useContextMock.mockReset();
  });

  afterEach(() => {
    warnSpy.mockRestore();
  });

  it('returns the gate value from the Statsig client when present', () => {
    useContextMock.mockReturnValue({
      client: {
        checkGate: (name: string) => name === 'chat_enabled',
      },
    });

    expect(useFeatureGate('chat_enabled')).toEqual({ value: true });
    expect(useFeatureGate('beta_search')).toEqual({ value: false });
    expect(warnSpy).not.toHaveBeenCalled();
  });

  it('returns false and warns when the Statsig client is not initialized', () => {
    useContextMock.mockReturnValue({ client: null });

    expect(useFeatureGate('any_gate')).toEqual({ value: false });
    expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('any_gate'));
  });
});
