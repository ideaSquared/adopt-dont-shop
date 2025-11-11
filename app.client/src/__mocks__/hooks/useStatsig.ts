/**
 * Mock for useStatsig hook
 */

export const useStatsig = jest.fn(() => ({
  client: null,
  logEvent: jest.fn(),
  checkGate: jest.fn(() => false),
  getExperiment: jest.fn(() => null),
  getDynamicConfig: jest.fn(() => null),
}));
