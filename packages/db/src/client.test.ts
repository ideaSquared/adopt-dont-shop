import { afterEach, describe, expect, it, vi } from 'vitest';
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

  describe('pool connection budget (ADS-1042)', () => {
    const originalPoolMax = process.env.DB_POOL_MAX;

    afterEach(() => {
      if (originalPoolMax === undefined) {
        delete process.env.DB_POOL_MAX;
      } else {
        process.env.DB_POOL_MAX = originalPoolMax;
      }
    });

    it('applies the conservative default pool max when nothing overrides it', () => {
      delete process.env.DB_POOL_MAX;
      const pool = createDbClient({
        schema: 'test',
        connectionString: 'postgres://localhost/test',
      });

      // Not node-pg's implicit 10 — an explicit budgeted ceiling so 10 services
      // × max stays under a tuned max_connections with replica headroom.
      expect(pool.options.max).toBe(8);

      void pool.end();
    });

    it('lets DB_POOL_MAX override the default', () => {
      process.env.DB_POOL_MAX = '5';
      const pool = createDbClient({
        schema: 'test',
        connectionString: 'postgres://localhost/test',
      });

      expect(pool.options.max).toBe(5);

      void pool.end();
    });

    it('ignores a malformed DB_POOL_MAX and keeps the default', () => {
      process.env.DB_POOL_MAX = 'not-a-number';
      const pool = createDbClient({
        schema: 'test',
        connectionString: 'postgres://localhost/test',
      });

      expect(pool.options.max).toBe(8);

      void pool.end();
    });

    it('lets an explicit max in options win over DB_POOL_MAX and the default', () => {
      process.env.DB_POOL_MAX = '5';
      const pool = createDbClient({
        schema: 'test',
        connectionString: 'postgres://localhost/test',
        max: 3,
      });

      expect(pool.options.max).toBe(3);

      void pool.end();
    });

    it('ignores a malformed explicit max (0, negative, non-integer) and falls back', () => {
      delete process.env.DB_POOL_MAX;
      for (const badMax of [0, -1, 2.5]) {
        const pool = createDbClient({
          schema: 'test',
          connectionString: 'postgres://localhost/test',
          max: badMax,
        });

        expect(pool.options.max).toBe(8);

        void pool.end();
      }
    });

    it('applies the same pool max to the read replica pool', () => {
      process.env.DB_POOL_MAX = '6';
      const pool = createDbClient({
        schema: 'pets',
        connectionString: 'postgres://localhost/primary',
        readUrl: 'postgres://replica.example.com/pets',
      });

      expect(pool.read.options.max).toBe(6);

      void pool.read.end();
      void pool.end();
    });
  });

  describe('schema validation', () => {
    it('throws on a schema name that is not a plain SQL identifier', () => {
      expect(() =>
        createDbClient({ schema: 'bad"; DROP', connectionString: 'postgres://localhost/test' })
      ).toThrow(/invalid schema name/);
    });

    it('accepts a normal schema name', () => {
      const pool = createDbClient({
        schema: 'auth',
        connectionString: 'postgres://localhost/test',
      });
      expect(pool).toBeDefined();
      void pool.end();
    });
  });

  describe('connection behaviour', () => {
    it('rejects within ~connectionTimeoutMillis when connecting to a non-routable address', async () => {
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
    }, 3_000); // Test-level timeout: well above the pool timeout, below the default 5s
  });

  describe('idle client error handling (ADS-1040)', () => {
    it('attaches a persistent pool error listener so an idle-client error does not crash the process', () => {
      const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
      const pool = createDbClient({
        schema: 'test',
        connectionString: 'postgres://localhost/test',
      });

      try {
        // Without a listener, an EventEmitter 'error' is re-thrown by Node and
        // terminates the process; the persistent listener delivers it instead.
        expect(pool.listenerCount('error')).toBeGreaterThan(0);
        expect(() => pool.emit('error', new Error('idle client terminated'))).not.toThrow();
        expect(errorSpy).toHaveBeenCalled();
      } finally {
        errorSpy.mockRestore();
        void pool.end();
      }
    });

    it('attaches the error listener to the read pool too when a replica is configured', () => {
      const pool = createDbClient({
        schema: 'pets',
        connectionString: 'postgres://localhost/primary',
        readUrl: 'postgres://replica.example.com/pets',
      });

      try {
        expect(pool.read.listenerCount('error')).toBeGreaterThan(0);
      } finally {
        void pool.read.end();
        void pool.end();
      }
    });
  });

  describe('read-replica routing (ADS-815)', () => {
    it('aliases .read to the primary when no readUrl is configured (single-instance fallback)', () => {
      const pool = createDbClient({
        schema: 'pets',
        connectionString: 'postgres://localhost/primary',
      });

      // Read-only call sites use pool.read unconditionally; with no replica it
      // is the very same primary pool.
      expect(pool.read).toBe(pool);

      void pool.end();
    });

    it('treats an empty readUrl as no replica', () => {
      const pool = createDbClient({
        schema: 'pets',
        connectionString: 'postgres://localhost/primary',
        readUrl: '',
      });

      expect(pool.read).toBe(pool);

      void pool.end();
    });

    it('opens a distinct read pool against readUrl when configured', () => {
      const pool = createDbClient({
        schema: 'pets',
        connectionString: 'postgres://localhost/primary',
        readUrl: 'postgres://replica.example.com/pets',
      });

      // A separate pool is created for reads …
      expect(pool.read).not.toBe(pool);
      // … pointed at the replica, not the primary.
      expect(pool.read.options.connectionString).toBe('postgres://replica.example.com/pets');
      expect(pool.options.connectionString).toBe('postgres://localhost/primary');

      void pool.read.end();
      void pool.end();
    });

    it('applies the same timeout defaults to the read pool', () => {
      const pool = createDbClient({
        schema: 'pets',
        connectionString: 'postgres://localhost/primary',
        readUrl: 'postgres://replica.example.com/pets',
      });

      expect(pool.read.options.connectionTimeoutMillis).toBe(10_000);
      expect(pool.read.options.statement_timeout).toBe(30_000);

      void pool.read.end();
      void pool.end();
    });
  });
});
