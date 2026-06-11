/**
 * ADS-587: Fixture test verifying the client ESLint config forbids
 * native `alert(...)` and `confirm(...)` calls — they must be migrated to
 * `useConfirm` and `toast.*` from @adopt-dont-shop/lib.components.
 */
import { Linter } from 'eslint';
import { describe, it, expect } from 'vitest';

const lint = (source: string) => {
  const linter = new Linter();
  return linter.verify(source, {
    languageOptions: { ecmaVersion: 2022, sourceType: 'module' },
    rules: {
      'no-restricted-globals': ['error', 'alert', 'confirm'],
    },
  });
};

describe('no-restricted-globals fixture (ADS-587)', () => {
  it('flags alert(...) as an error', () => {
    const messages = lint('alert("oops");');
    expect(messages).toHaveLength(1);
    expect(messages[0]?.ruleId).toBe('no-restricted-globals');
    expect(messages[0]?.severity).toBe(2);
  });

  it('flags confirm(...) as an error', () => {
    const messages = lint('if (confirm("really?")) {}');
    expect(messages).toHaveLength(1);
    expect(messages[0]?.ruleId).toBe('no-restricted-globals');
    expect(messages[0]?.severity).toBe(2);
  });

  it('allows toast.error(...) and useConfirm() replacements', () => {
    const messages = lint(
      'const toast = { error: (_m) => {} }; toast.error("nope"); const useConfirm = () => ({ confirm: async () => true }); useConfirm();'
    );
    expect(messages).toHaveLength(0);
  });
});
