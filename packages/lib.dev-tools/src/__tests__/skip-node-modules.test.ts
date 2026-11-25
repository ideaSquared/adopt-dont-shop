import type { Plugin } from 'vite';
import { describe, expect, it, vi } from 'vitest';
import { skipNodeModules } from '../../../../vite.shared.config';

type Transform = (code: string, id: string) => unknown;

// Third-party packages can ship plain modules named `*.css.js` (Sentry's feedback widget does).
// vanilla-extract claims every `*.css.js` file and fails the build on them, so the apps keep it
// away from node_modules.
describe('skipNodeModules', () => {
  const wrap = (transform: Transform): Transform => {
    const [plugin] = skipNodeModules([{ name: 'p', transform } as Plugin]);
    return plugin.transform as Transform;
  };

  it('does not hand node_modules files to the wrapped plugin', () => {
    const transform = vi.fn(() => 'compiled');
    const result = wrap(transform)('code', '/repo/node_modules/@sentry/feedback/Dialog.css.js');
    expect(result).toBeNull();
    expect(transform).not.toHaveBeenCalled();
  });

  it('still hands workspace files to the wrapped plugin', () => {
    const transform = vi.fn(() => 'compiled');
    const result = wrap(transform)('code', '/repo/packages/lib.components/src/Button.css.ts');
    expect(result).toBe('compiled');
  });

  it('leaves plugins without a transform hook untouched', () => {
    const plugin: Plugin = { name: 'no-transform' };
    expect(skipNodeModules([plugin])).toEqual([plugin]);
  });
});
