import { describe, it, expect } from 'vitest';
import { logger } from '../../utils/logger';

/**
 * ADS-784 regression: the log format chain (URL redaction + JSON
 * serialisation) must never throw on circular or deeply-nested meta.
 * A circular Sequelize/umzug object in migration error meta previously
 * blew the stack / threw "Converting circular structure to JSON" and
 * aborted `db:migrate` outright.
 */
describe('logger format robustness', () => {
  it('does not throw when meta contains a circular reference', () => {
    const circular: Record<string, unknown> = { name: 'node' };
    circular.self = circular;

    expect(() => logger.info('circular meta', { circular })).not.toThrow();
  });

  it('does not throw on a circular reference nested inside arrays', () => {
    const a: Record<string, unknown> = { id: 1 };
    const b: Record<string, unknown> = { id: 2, peers: [a] };
    a.peers = [b];

    expect(() => logger.error('cyclic graph', { a, b })).not.toThrow();
  });

  it('does not throw on a deeply nested object', () => {
    let deep: Record<string, unknown> = { value: 'leaf' };
    for (let i = 0; i < 200; i += 1) {
      deep = { nested: deep };
    }

    expect(() => logger.warn('deep meta', { deep })).not.toThrow();
  });
});
