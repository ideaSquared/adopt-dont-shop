import { describe, expect, it } from 'vitest';
import { resolveEnv } from './env.js';
import { argvForHistory, resolveMethod, resolveService } from './resolve.js';
import { sampleIndex } from './test-support.js';

describe('environment resolution', () => {
  it('prefers the flag, then ADS_OPS_ENV, then the saved env, then dev', () => {
    expect(resolveEnv({ flag: 'prod', envVar: 'staging', saved: 'staging' })).toBe('prod');
    expect(resolveEnv({ envVar: 'staging', saved: 'prod' })).toBe('staging');
    expect(resolveEnv({ saved: 'prod' })).toBe('prod');
    expect(resolveEnv({})).toBe('dev');
  });

  it('rejects unknown names with a usage error that says where it came from', () => {
    expect(() => resolveEnv({ flag: 'qa' })).toThrow(/Unknown environment "qa" \(from --env\)/);
    expect(() => resolveEnv({ envVar: 'qa' })).toThrow(/ADS_OPS_ENV/);
  });
});

describe('service and command lookup', () => {
  it('suggests close service names', () => {
    expect(() => resolveService(sampleIndex, 'pet')).toThrow(/Unknown command or service "pet"/);
    try {
      resolveService(sampleIndex, 'pet');
    } catch (e) {
      expect((e as { hint: string }).hint).toContain('Did you mean `pnpm ops pets`?');
    }
  });

  it('suggests close command names', () => {
    const service = resolveService(sampleIndex, 'pets');
    try {
      resolveMethod(service, 'update-statu');
      expect.unreachable();
    } catch (e) {
      expect((e as { hint: string }).hint).toContain('Did you mean `update-status`?');
    }
    expect(resolveMethod(service, 'list').rpc).toBe('pets.List');
  });
});

describe('history argv', () => {
  it('drops env, --yes and --refresh so a replay previews and follows the current env', () => {
    expect(
      argvForHistory([
        '-e',
        'prod',
        'pets',
        'update-status',
        'x',
        '--yes',
        '--env=dev',
        '--refresh',
        '--status',
        'adopted',
      ])
    ).toEqual(['pets', 'update-status', 'x', '--status', 'adopted']);
  });
});
