import type { OpsEnv } from '@adopt-dont-shop/ops-contract';
import type { Client } from './client.js';
import type { Ctx } from './ctx.js';
import { withAuth } from './login.js';
import { connect } from './tunnel.js';

// Lazy plumbing: tunnel if needed, session if needed, then run `fn`.
export const withServer = async <T>(
  ctx: Ctx,
  env: OpsEnv,
  fn: (client: Client) => Promise<T>
): Promise<T> => withAuth(ctx, env, await connect(ctx, env), fn);
