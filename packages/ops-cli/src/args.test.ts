import { describe, expect, it } from 'vitest';
import { parseArgv, readGlobals } from './args.js';
import { UsageError } from './errors.js';
import { main } from './router.js';
import { json, makeCtx } from './test-support.js';

const globalsFor = (argv: string[]) => readGlobals(parseArgv(argv).values);

describe('global options that need a value', () => {
  it.each([['--env'], ['-e'], ['--output'], ['-o'], ['--json']])(
    'rejects a bare %s as a usage error',
    flag => {
      const error = (() => {
        try {
          return globalsFor(['pets', 'list', flag]);
        } catch (e) {
          return e;
        }
      })();
      expect(error).toBeInstanceOf(UsageError);
      expect(error).toMatchObject({ exitCode: 2 });
    }
  );

  it('rejects an empty --env= value', () => {
    expect(() => globalsFor(['--env='])).toThrow(UsageError);
  });

  it('rejects --env followed by another flag', () => {
    expect(() => globalsFor(['--env', '--yes'])).toThrow(/--env. needs a value/);
  });

  it('names the allowed environments for --env', () => {
    expect(() => globalsFor(['-e'])).toThrow('`--env` needs a value: dev, staging or prod.');
  });

  it('still reads values that are present', () => {
    expect(globalsFor(['--env', 'staging', '-o', 'json']).env).toBe('staging');
    expect(globalsFor(['--env=prod']).env).toBe('prod');
  });

  it('exits 2 and never touches the server when --env has no value', async () => {
    const ctx = await makeCtx({ routes: () => json({}) });
    expect(await main(['pets', 'list', '--env'], ctx)).toBe(2);
    expect(ctx.requests).toEqual([]);
  });

  it('keeps shell completion working while --env is half typed', async () => {
    const ctx = await makeCtx({ routes: () => json({}) });
    expect(await main(['__complete', 'pets', '--env'], ctx)).toBe(0);
  });
});
