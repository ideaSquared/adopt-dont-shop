import { describe, expect, it } from 'vitest';
import { veCssMock } from '../../../../vite.shared.config';

// Vite plugin hooks can be either functions or { handler } objects. Normalise
// to the underlying function so the test invokes it directly.
function asFn<T extends (...args: unknown[]) => unknown>(hook: unknown): T {
  if (typeof hook === 'function') {
    return hook as T;
  }
  if (hook && typeof hook === 'object' && 'handler' in hook) {
    return (hook as { handler: T }).handler;
  }
  throw new Error('Unexpected hook shape');
}

// ADS-761: regression coverage for the shared veCssMock plugin. The
// regex-driven named-export discovery is the historical foot-gun — if
// someone adjusts the regex and forgets a flavour of `export const`,
// app tests silently lose those named imports. These cases pin the
// behaviour so the next change has to update tests too.
describe('veCssMock vanilla-extract stub plugin', () => {
  describe('transform', () => {
    const transform = asFn<(code: string, id: string) => { code: string } | undefined>(
      veCssMock.transform
    );

    it('ignores non-.css.ts modules', () => {
      const result = transform('export const a = 1;', '/x/Component.ts');
      expect(result).toBeUndefined();
    });

    it('emits stubs for every named export in a .css.ts file', () => {
      // The regex anchors on start-of-line, so exports must be at column 0.
      const source = [
        `export const button = style({});`,
        `export let card = style({});`,
        `export var input = style({});`,
        `export function helper() {}`,
      ].join('\n');
      const result = transform(source, '/x/Component.css.ts');
      expect(result).toBeDefined();
      expect(result?.code).toContain('export const button=_p();');
      expect(result?.code).toContain('export const card=_p();');
      expect(result?.code).toContain('export const input=_p();');
      expect(result?.code).toContain('export const helper=_p();');
      expect(result?.code).toContain('export default _p();');
    });
  });

  describe('load', () => {
    const load = asFn<(id: string) => string | undefined>(veCssMock.load);

    it('returns an empty-default module for virtual ve-stub ids', () => {
      expect(load('\0ve-stub:/x/foo.css')).toBe('export default {};');
    });

    it('returns nothing for non-stub ids', () => {
      expect(load('/x/foo.ts')).toBeUndefined();
    });
  });

  describe('resolveId', () => {
    const resolveId = asFn<(id: string, importer: string | undefined) => string | undefined>(
      veCssMock.resolveId
    );

    it('returns nothing without an importer', () => {
      expect(resolveId('./foo.css', undefined)).toBeUndefined();
    });

    it('skips .module.css files', () => {
      expect(resolveId('./foo.module.css', '/x/index.ts')).toBeUndefined();
    });

    it('produces a virtual stub id for .css imports that have no .ts sibling', () => {
      // /tmp/non-existent.css.ts almost certainly does not exist on disk,
      // so the resolver should fall through to the virtual stub id.
      const result = resolveId('/tmp/non-existent.css', '/tmp/importer.ts');
      expect(result).toBe('\0ve-stub:/tmp/non-existent.css');
    });
  });
});
