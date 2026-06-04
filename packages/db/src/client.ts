import { Pool, type PoolConfig } from 'pg';

export type DbClientOptions = PoolConfig & {
  // Postgres schema this service owns. Every connection's search_path is set
  // to `<schema>, public` so unqualified table refs resolve service-locally
  // while PostGIS types/operators (installed into `public` by the postgis
  // Docker image) remain resolvable. CAD lesson from PR #48 — without
  // `public` on the path, `geography(Point,4326)` and `<->` blow up.
  schema: string;
};

export function createDbClient(opts: DbClientOptions): Pool {
  const { schema, ...config } = opts;
  const pool = new Pool(config);

  pool.on('connect', client => {
    void client.query(`SET search_path TO "${schema}", public`);
  });

  return pool;
}
