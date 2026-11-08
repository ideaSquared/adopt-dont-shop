// One-shot CLI: create the first super_admin in a fresh environment.
//
//   printf '%s' "$PASSWORD" | node dist/db/bootstrap-admin.js --password-stdin \
//     --email ops@example.org --first-name Ada --last-name Admin
//
// Compiled into dist/ and run under plain node (no tsx), unlike db:seed, and
// deliberately does NOT call assertNotProduction: production is its purpose.
// Refuses (exit 1) if an active super_admin already exists. The password is
// read from stdin only and is never logged. Logic lives in
// bootstrap-admin-core.ts.

import { parseArgs } from 'node:util';

import bcrypt from 'bcryptjs';

import { createDbClient } from '@adopt-dont-shop/db';
import { ensureStream } from '@adopt-dont-shop/events';
import { createLogger } from '@adopt-dont-shop/observability';
import { connectNats } from '@adopt-dont-shop/service-bootstrap';

import { loadConfig } from '../config.js';
import { bootstrapSuperAdmin, resolveCliIdentity, USAGE } from './bootstrap-admin-core.js';

// Matches the runtime hasher (createBcryptPasswordHasher).
const BCRYPT_ROUNDS = 12;

const readStdin = async (): Promise<string> => {
  const chunks: Buffer[] = [];
  for await (const chunk of process.stdin) {
    chunks.push(Buffer.from(chunk));
  }
  // Strip only the trailing newline added by echo/here-strings.
  return Buffer.concat(chunks)
    .toString('utf8')
    .replace(/\r?\n$/, '');
};

const main = async (): Promise<void> => {
  const logger = createLogger({ serviceName: 'service.auth.bootstrap-admin' });
  const { values } = parseArgs({
    options: {
      email: { type: 'string' },
      'first-name': { type: 'string' },
      'last-name': { type: 'string' },
      'password-stdin': { type: 'boolean' },
    },
  });

  let pool: ReturnType<typeof createDbClient> | undefined;
  let nats: Awaited<ReturnType<typeof connectNats>> | undefined;
  try {
    const identity = resolveCliIdentity(values, process.env);
    const password = await readStdin();
    const config = loadConfig();
    pool = createDbClient({ connectionString: config.databaseUrl, schema: config.schema });
    nats = await connectNats(config.natsUrl);
    await ensureStream(nats);

    const { userId } = await bootstrapSuperAdmin(
      { pool, nats, hash: pw => bcrypt.hash(pw, BCRYPT_ROUNDS) },
      { ...identity, password }
    );
    // No email in the structured log (PII); the operator sees it on stdout.
    logger.info('bootstrapped super_admin', { userId });
    process.stdout.write(`super_admin created: ${identity.email} (${userId})\n`);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    logger.error('bootstrap-admin failed', { message });
    console.error(`bootstrap-admin failed: ${message}\n${USAGE}`);
    process.exitCode = 1;
  } finally {
    await nats?.drain();
    await pool?.end();
  }
};

void main();
