// jest.mock factories must only reference variables whose names begin with
// "mock" — Jest hoists the mock above the imports but NOT the local
// declarations, so non-mock-prefixed variables would be undefined at the
// time the factory runs.
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

import { useFeatureGate, _warnedGatesForTesting } from './useFeatureGate';

describe('useFeatureGate', () => {
  let warnSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    mockUseContext.mockReset();
    // Reset the dedupe set so each test starts clean.
    _warnedGatesForTesting.clear();
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

  it('warns at most once per gate name even across multiple renders', () => {
    mockUseContext.mockReturnValue({ client: null });

    useFeatureGate('deduped_gate');
    useFeatureGate('deduped_gate');
    useFeatureGate('deduped_gate');

    expect(warnSpy).toHaveBeenCalledTimes(1);
  });

  it('warns independently for different gate names', () => {
    mockUseContext.mockReturnValue({ client: null });

    useFeatureGate('gate_a');
    useFeatureGate('gate_b');
    useFeatureGate('gate_a'); // should not warn again

    expect(warnSpy).toHaveBeenCalledTimes(2);
    expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('gate_a'));
    expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('gate_b'));
  });
});
