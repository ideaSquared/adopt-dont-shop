/**
 * Jest mock for @vanilla-extract/css and @vanilla-extract/recipes.
 * VE style() / recipe() / etc. require a build-time file scope that doesn't
 * exist in jsdom — these stubs return empty strings so imports from
 * *.css.ts files resolve without errors during tests.
 */

export const style = () => '';
export const styleVariants = (_map: Record<string, unknown>) =>
  Object.fromEntries(Object.keys(_map).map((k) => [k, '']));
export const globalStyle = () => undefined;
export const keyframes = () => '';
export const createVar = () => '';
export const fallbackVar = (..._args: string[]) => '';
export const recipe = (_config: unknown) => () => '';
