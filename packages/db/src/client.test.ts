import { describe, expect, it } from 'vitest';
import { createDbClient } from './client.js';

describe('createDbClient', () => {
  describe('timeout defaults', () => {
    it('applies default timeout values when caller supplies only schema and connectionString', () => {
      const pool = createDbClient({
        schema: 'test',
        connectionString: 'postgres://localhost/test',
      });

      // Unresponsive Postgres must fail fast — defaults must be present
      expect(pool.options.connectionTimeoutMillis).toBe(10_000);
      expect(pool.options.idleTimeoutMillis).toBe(30_000);
      expect(pool.options.statement_timeout).toBe(30_000);
      expect(pool.options.query_timeout).toBe(30_000);

      void pool.end();
    });

    it('allows caller to override connectionTimeoutMillis', () => {
      const pool = createDbClient({
        schema: 'test',
        connectionString: 'postgres://localhost/test',
        connectionTimeoutMillis: 5_000,
      });

      expect(pool.options.connectionTimeoutMillis).toBe(5_000);

      void pool.end();
    });

    it('allows caller to override all timeout defaults', () => {
      const pool = createDbClient({
        schema: 'test',
        connectionString: 'postgres://localhost/test',
        connectionTimeoutMillis: 1_000,
        idleTimeoutMillis: 2_000,
        statement_timeout: 3_000,
        query_timeout: 4_000,
      });

      expect(pool.options.connectionTimeoutMillis).toBe(1_000);
      expect(pool.options.idleTimeoutMillis).toBe(2_000);
      expect(pool.options.statement_timeout).toBe(3_000);
      expect(pool.options.query_timeout).toBe(4_000);

      void pool.end();
    });
  });

  describe('connection behaviour', () => {
    it(
      'rejects within ~connectionTimeoutMillis when connecting to a non-routable address',
      async () => {
        const startMs = Date.now();
        const pool = createDbClient({
          schema: 'test',
          // 10.255.255.1 is a non-routable address — TCP SYN will never be answered
          host: '10.255.255.1',
          port: 5432,
          // Small override to keep the test fast and also proves overridability
          connectionTimeoutMillis: 500,
        });

        await expect(pool.connect()).rejects.toThrow();

        const elapsedMs = Date.now() - startMs;
        // Should have rejected within roughly 2× the timeout (generous upper bound)
        expect(elapsedMs).toBeLessThan(2_000);

        void pool.end();
      },
      // Test-level timeout: well above the pool timeout, below the default 5s
      3_000,
    );
  });
});
