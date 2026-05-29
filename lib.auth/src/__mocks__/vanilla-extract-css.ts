/**
 * Vitest stub for @vanilla-extract/css. VE's style() / createTheme() etc.
 * require a build-time file scope that doesn't exist in jsdom — these
 * stubs return empty strings (or empty objects) so imports from *.css.ts
 * files resolve without errors during tests.
 */

export const style = () => '';
export const styleVariants = (map: Record<string, unknown>) =>
  Object.fromEntries(Object.keys(map).map((k) => [k, '']));
export const globalStyle = () => undefined;
export const keyframes = () => '';
export const createVar = () => '';
export const fallbackVar = () => '';
export const createTheme = () => ['', {}] as const;
export const createThemeContract = (contract: unknown): unknown => {
  if (contract && typeof contract === 'object') {
    const walk = (input: Record<string, unknown>): Record<string, unknown> =>
      Object.fromEntries(
        Object.entries(input).map(([k, v]) => [
          k,
          v && typeof v === 'object' ? walk(v as Record<string, unknown>) : '',
        ])
      );
    return walk(contract as Record<string, unknown>);
  }
  return {};
};
export const createGlobalTheme = () => ({});
export const assignVars = () => ({});
export const recipe = () => () => '';
