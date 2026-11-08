// One-shot CLI: create the first super_admin in a fresh environment.
//
//   printf '%s' "$PASSWORD" | node dist/db/bootstrap-admin.js --password-stdin \
//     --email ops@example.org --first-name Ada --last-name Admin
//
// Compiled into dist/ and run under plain node (no tsx), unlike db:seed, and
// deliberately does NOT call assertNotProduction: production is its purpose.
// Refuses (exit 1) if an active super_admin already exists. The password is
// read from stdin only and is never logged. Logic lives in
// bootstrap-admin-core.ts; this file is the I/O wiring, injectable so it can
// be tested without a database or NATS.

import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';

import bcrypt from 'bcryptjs';
import type { NatsConnection } from 'nats';
import type { Pool } from 'pg';

import { createDbClient } from '@adopt-dont-shop/db';
import { ensureStream } from '@adopt-dont-shop/events';
import { createLogger } from '@adopt-dont-shop/observability';
import { connectNats } from '@adopt-dont-shop/service-bootstrap';

import { loadConfig } from '../config.js';
import { bootstrapSuperAdmin, resolveCliIdentity, USAGE } from './bootstrap-admin-core.js';

// Matches the runtime hasher (createBcryptPasswordHasher).
const BCRYPT_ROUNDS = 12;

type CliPool = Pool & { end: () => Promise<void> };
type CliNats = NatsConnection & { drain: () => Promise<void> };

export type BootstrapCliDeps = {
  argv: string[];
  env: NodeJS.ProcessEnv;
  readStdin: () => Promise<string>;
  openPool: () => CliPool;
  openNats: () => Promise<CliNats>;
  hash: (password: string) => Promise<string>;
  out: (text: string) => void;
  err: (text: string) => void;
  log: {
    info: (message: string, meta: Record<string, unknown>) => void;
    error: (message: string, meta: Record<string, unknown>) => void;
  };
};

// Strip only the trailing newline added by echo/here-strings.
export const stripTrailingNewline = (input: string): string => input.replace(/\r?\n$/, '');

// Returns the process exit code. Never logs the password or the email.
export const runBootstrapCli = async (deps: BootstrapCliDeps): Promise<number> => {
  let pool: CliPool | undefined;
  let nats: CliNats | undefined;
  try {
    const { values } = parseArgs({
      args: deps.argv,
      options: {
        email: { type: 'string' },
        'first-name': { type: 'string' },
        'last-name': { type: 'string' },
        'password-stdin': { type: 'boolean' },
      },
    });
    const identity = resolveCliIdentity(values, deps.env);
    const password = stripTrailingNewline(await deps.readStdin());
    pool = deps.openPool();
    nats = await deps.openNats();

    const { userId } = await bootstrapSuperAdmin(
      { pool, nats, hash: deps.hash },
      { ...identity, password }
    );
    deps.log.info('bootstrapped super_admin', { userId });
    deps.out(`super_admin created: ${identity.email} (${userId})\n`);
    return 0;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    deps.log.error('bootstrap-admin failed', { message });
    deps.err(`bootstrap-admin failed: ${message}\n${USAGE}\n`);
    return 1;
  } finally {
    await nats?.drain();
    await pool?.end();
  }
};

const readProcessStdin = async (): Promise<string> => {
  const chunks: Buffer[] = [];
  for await (const chunk of process.stdin) {
    chunks.push(Buffer.from(chunk));
  }
  return Buffer.concat(chunks).toString('utf8');
};

const isEntryPoint = (): boolean =>
  process.argv[1] !== undefined && fileURLToPath(import.meta.url) === resolve(process.argv[1]);

if (isEntryPoint()) {
  const logger = createLogger({ serviceName: 'service.auth.bootstrap-admin' });
  // loadConfig runs inside openPool/openNats (called within runBootstrapCli's
  // try) so a missing DATABASE_URL prints the usage instead of a stack trace.
  void runBootstrapCli({
    argv: process.argv.slice(2),
    env: process.env,
    readStdin: readProcessStdin,
    openPool: () => {
      const config = loadConfig();
      return createDbClient({ connectionString: config.databaseUrl, schema: config.schema });
    },
    openNats: async () => {
      const nats = await connectNats(loadConfig().natsUrl);
      await ensureStream(nats);
      return nats;
    },
    hash: password => bcrypt.hash(password, BCRYPT_ROUNDS),
    out: text => process.stdout.write(text),
    err: text => process.stderr.write(text),
    log: logger,
  }).then(code => {
    process.exitCode = code;
  });
}
