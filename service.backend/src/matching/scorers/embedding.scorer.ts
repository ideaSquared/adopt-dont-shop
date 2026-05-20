import { AdopterContext, MatchScorer, PetContext, ScoreResult } from '../types';

/**
 * Embedding-based semantic scorer. Scaffold only — ships inert at
 * weight 0 in v1. When enabled this will read pgvector columns
 * (pet_embedding, adopter_embedding) and return cosine similarity
 * scaled to 0..100.
 *
 * Activation checklist (deferred to v1.1):
 *   1. Add migration enabling `CREATE EXTENSION vector` + embedding
 *      columns on pets / adopter_match_profile.
 *   2. Stand up a job that embeds new pets (e.g. via Anthropic /
 *      OpenAI embeddings API) and writes the vector.
 *   3. Replace the stub below with a cosine query against pgvector.
 *   4. Bump `MATCH_BLEND_EMBEDDING` above 0.
 */
export class EmbeddingScorer implements MatchScorer {
  readonly name = 'embedding' as const;

  async score(_adopter: AdopterContext, _pet: PetContext): Promise<ScoreResult> {
    return { score: 50, reasons: [] };
  }
}
