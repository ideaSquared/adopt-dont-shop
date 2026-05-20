import { AdopterContext, MatchScorer, PetContext, ScoreResult } from '../types';

/**
 * LLM re-rank scorer. Scaffold only — ships inert at weight 0 in v1.
 * When enabled this should:
 *
 *   1. Be invoked ONLY for the top-N (≤ 20) pets that survive the
 *      rule + CF blend, so per-request LLM cost stays bounded.
 *   2. Cache results per (userId, petId, prompt-hash) in Redis with a
 *      24h TTL — pets and adopter profiles change slowly.
 *   3. Use prompt caching against Anthropic's API: stable adopter
 *      profile block first, per-pet block last.
 *   4. Return a 0..100 score and a one-sentence rationale (which
 *      currently is NOT surfaced — chip reasons remain rule-owned).
 *
 * Until then it returns a neutral 50 to keep the blend mathematically
 * well-defined if a misconfigured env sets the weight non-zero.
 */
export class LlmScorer implements MatchScorer {
  readonly name = 'llm' as const;

  async score(_adopter: AdopterContext, _pet: PetContext): Promise<ScoreResult> {
    return { score: 50, reasons: [] };
  }
}
