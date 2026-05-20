import { ScorerName } from './types';

/**
 * Runtime config for the matching module.
 *
 * Source of truth is `DEFAULTS` below — checked-in, code-reviewed,
 * typed. Env vars exist as an *escape hatch* for ops (kill switch in
 * an incident, A/B tweaks without a deploy) but are not required and
 * are intentionally not declared in docker-compose / .env. Flip them
 * by setting the var in the running environment when you need to.
 *
 * To change defaults for everyone, edit `DEFAULTS` and ship a code
 * change so reviewers see the new weights/flags.
 */

export type MatchConfig = {
  /** Master kill switch. When false, discovery falls back to legacy sort. */
  enabled: boolean;
  /** Daily-digest job registration in BullMQ. */
  digestEnabled: boolean;
  /** Populate relevanceScore + re-order on pet search results. */
  searchRerank: boolean;
  /**
   * Per-scorer weight. Doesn't need to sum to 1 — match.service
   * normalises. Set to 0 to disable a scorer entirely.
   */
  blend: Record<ScorerName, number>;
  /** Redis TTL for the per-(user, pet, mix-hash) score cache. */
  cacheTtlSeconds: number;
};

const DEFAULTS: MatchConfig = {
  enabled: true,
  digestEnabled: false,
  searchRerank: false,
  blend: {
    rule: 0.6,
    cf: 0.4,
    embedding: 0,
    llm: 0,
  },
  cacheTtlSeconds: 3600,
};

const parseBool = (raw: string | undefined, fallback: boolean): boolean => {
  if (raw === undefined) return fallback;
  const v = raw.trim().toLowerCase();
  return v === '1' || v === 'true' || v === 'yes';
};

const parseFloat0 = (raw: string | undefined, fallback: number): number => {
  if (raw === undefined) return fallback;
  const n = Number(raw);
  return Number.isFinite(n) && n >= 0 ? n : fallback;
};

/**
 * Resolve effective config. Env vars are an optional override layer
 * for ops; the typed `DEFAULTS` constant above is the canonical
 * source for product changes.
 */
export const loadMatchConfig = (): MatchConfig => ({
  enabled: parseBool(process.env.MATCH_ENABLED, DEFAULTS.enabled),
  digestEnabled: parseBool(process.env.MATCH_DIGEST_ENABLED, DEFAULTS.digestEnabled),
  searchRerank: parseBool(process.env.MATCH_SEARCH_RERANK, DEFAULTS.searchRerank),
  blend: {
    rule: parseFloat0(process.env.MATCH_BLEND_RULE, DEFAULTS.blend.rule),
    cf: parseFloat0(process.env.MATCH_BLEND_CF, DEFAULTS.blend.cf),
    embedding: parseFloat0(process.env.MATCH_BLEND_EMBEDDING, DEFAULTS.blend.embedding),
    llm: parseFloat0(process.env.MATCH_BLEND_LLM, DEFAULTS.blend.llm),
  },
  cacheTtlSeconds: parseFloat0(process.env.MATCH_CACHE_TTL_SECONDS, DEFAULTS.cacheTtlSeconds),
});

export const getActiveScorerNames = (cfg: MatchConfig): ScorerName[] =>
  (Object.entries(cfg.blend) as Array<[ScorerName, number]>)
    .filter(([, weight]) => weight > 0)
    .map(([name]) => name);
