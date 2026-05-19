import { MatchConfig } from './config';
import { MatchScorer, ReasonChip, ScoreResult, ScorerName } from './types';

/**
 * Blend scorer outputs into a single ScoreResult. Weight normalisation
 * means an inert scorer (weight 0) drops out entirely — its result
 * isn't fetched in the first place since match.service skips zero-weight
 * scorers. Reasons come exclusively from the rule scorer; other scorers
 * contribute score only.
 */
export const blendScores = (
  inputs: Array<{ name: ScorerName; result: ScoreResult }>,
  cfg: MatchConfig
): ScoreResult => {
  const totalWeight = inputs.reduce((sum, { name }) => sum + cfg.blend[name], 0);
  if (totalWeight === 0) {
    return { score: 0, reasons: [] };
  }

  const weightedScore = inputs.reduce(
    (sum, { name, result }) => sum + result.score * cfg.blend[name],
    0
  );

  const reasons: ReasonChip[] = inputs
    .filter(({ name }) => name === 'rule')
    .flatMap(({ result }) => result.reasons)
    .slice(0, 3);

  return {
    score: Math.round(Math.min(100, Math.max(0, weightedScore / totalWeight))),
    reasons,
  };
};

export const runScorers = async (
  scorers: MatchScorer[],
  adopter: Parameters<MatchScorer['score']>[0],
  pet: Parameters<MatchScorer['score']>[1]
): Promise<Array<{ name: ScorerName; result: ScoreResult }>> => {
  const results = await Promise.all(
    scorers.map(async s => ({ name: s.name, result: await s.score(adopter, pet) }))
  );
  return results;
};
