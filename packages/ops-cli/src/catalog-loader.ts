import type { CatalogResponse, OpsEnv } from '@adopt-dont-shop/ops-contract';
import type { Client } from './client.js';
import type { Ctx } from './ctx.js';

export const CATALOG_TTL_MS = 60 * 60 * 1000;

export const isFresh = (fetchedAt: string, nowMs: number): boolean =>
  nowMs - Date.parse(fetchedAt) < CATALOG_TTL_MS;

export const loadCatalog = async (
  ctx: Ctx,
  env: OpsEnv,
  client: Client,
  refresh: boolean
): Promise<CatalogResponse> => {
  const cached = await ctx.store.readCatalogCache(env);
  if (!refresh && cached && cached.catalog.env === env && isFresh(cached.fetchedAt, ctx.now())) {
    return cached.catalog;
  }
  const catalog = await client.catalog();
  await ctx.store
    .writeCatalogCache(env, { fetchedAt: new Date(ctx.now()).toISOString(), catalog })
    .catch(() => undefined);
  return catalog;
};

// Help and completion do not need the network: any cached catalog will do.
export const loadCachedCatalog = async (
  ctx: Ctx,
  env: OpsEnv
): Promise<CatalogResponse | undefined> => {
  const cached = await ctx.store.readCatalogCache(env);
  return cached && cached.catalog.env === env ? cached.catalog : undefined;
};
