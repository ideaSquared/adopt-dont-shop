const RUN_ID =
  process.env.E2E_RUN_ID ?? `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;

// A per-process token. A Playwright retry can spawn a fresh worker process,
// which resets `counter` to 0. Under a stable E2E_RUN_ID that would collide the
// retry's generated identifiers with the original attempt's — e.g. the retry
// re-registers an already-verified throwaway email, leaving no outstanding
// verification token for the peek seam, so the retry hard-fails before it can
// re-exercise the flow it was meant to recover. This token keeps every
// process's identifiers disjoint so the built-in retry can actually retry.
const PROC = Math.random().toString(36).slice(2, 6);

let counter = 0;
const next = () => {
  counter += 1;
  return `${PROC}-${counter.toString().padStart(3, '0')}`;
};

export const runId = (): string => RUN_ID;

export const uniqueEmail = (label = 'user'): string =>
  `e2e+${label}-${RUN_ID}-${next()}@e2e.adoptdontshop.test`;

export const uniquePetName = (base = 'Bella'): string => `${base}-e2e-${RUN_ID}-${next()}`;

export const uniqueRescueName = (base = 'Test Rescue'): string => `${base} ${RUN_ID}-${next()}`;

export const uniqueText = (label = 'note'): string => `${label}-${RUN_ID}-${next()}`;
