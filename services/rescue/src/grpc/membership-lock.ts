import type { PoolClient } from 'pg';

// Serialise every path that puts a user on a rescue (add staff, accept an
// invitation, create a rescue with an owner). The membership table has no
// unique constraint across rescues, so the lock is what stops two concurrent
// writers both passing their checks. Transaction-scoped: released on commit.
export async function lockUserMembership(client: PoolClient, userId: string): Promise<void> {
  await client.query('SELECT pg_advisory_xact_lock(hashtext($1))', [userId]);
}
