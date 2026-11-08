import { describe, expect, it } from 'vitest';
import { UsageError } from './errors.js';
import { assertYesAllowed, decideWrite, validateProdConfirmation } from './write-flow.js';

describe('what happens after a write preview', () => {
  it('asks in a terminal: a yes/no confirm, defaulting to the caller', () => {
    expect(decideWrite({ interactive: true, env: 'dev', yes: false })).toEqual({
      action: 'confirm',
    });
    expect(decideWrite({ interactive: true, env: 'staging', yes: false })).toEqual({
      action: 'confirm',
    });
  });

  it('asks for the word "prod" in production', () => {
    expect(decideWrite({ interactive: true, env: 'prod', yes: false })).toEqual({
      action: 'confirm-prod',
    });
  });

  it('never prompts without a terminal: shows the plan and stops', () => {
    expect(decideWrite({ interactive: false, env: 'dev', yes: false })).toEqual({
      action: 'show-only',
    });
    expect(decideWrite({ interactive: false, env: 'prod', yes: false })).toEqual({
      action: 'show-only',
    });
  });

  it('runs straight away with --yes in dev and staging', () => {
    expect(decideWrite({ interactive: false, env: 'dev', yes: true })).toEqual({
      action: 'execute',
    });
    expect(decideWrite({ interactive: true, env: 'staging', yes: true })).toEqual({
      action: 'execute',
    });
  });

  it('refuses --yes in prod with a usage error', () => {
    expect(() => decideWrite({ interactive: true, env: 'prod', yes: true })).toThrow(UsageError);
    expect(() => assertYesAllowed('prod', true)).toThrow(/not allowed in prod/);
    expect(() => assertYesAllowed('prod', false)).not.toThrow();
  });
});

describe('prod confirmation text', () => {
  it('must be exactly "prod"', () => {
    expect(validateProdConfirmation('prod')).toBeUndefined();
    expect(validateProdConfirmation(' prod ')).toBeUndefined();
    expect(validateProdConfirmation('production')).toContain('Type prod exactly');
    expect(validateProdConfirmation('')).toContain('Type prod exactly');
  });
});
