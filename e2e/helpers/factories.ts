const RUN_ID =
  process.env.E2E_RUN_ID ?? `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;

let counter = 0;
const next = () => {
  counter += 1;
  return counter.toString().padStart(3, '0');
};

export const runId = (): string => RUN_ID;

export const uniqueEmail = (label = 'user'): string =>
  `e2e+${label}-${RUN_ID}-${next()}@e2e.adoptdontshop.test`;

export const uniquePetName = (base = 'Bella'): string => `${base}-e2e-${RUN_ID}-${next()}`;

export const uniqueRescueName = (base = 'Test Rescue'): string => `${base} ${RUN_ID}-${next()}`;

export const uniqueText = (label = 'note'): string => `${label}-${RUN_ID}-${next()}`;
