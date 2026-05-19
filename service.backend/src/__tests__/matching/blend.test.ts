import { describe, expect, it } from 'vitest';
import { blendScores } from '../../matching/blend';
import { MatchConfig } from '../../matching/config';

const cfg = (weights: Partial<MatchConfig['blend']> = { rule: 0.6, cf: 0.4 }): MatchConfig => ({
  enabled: true,
  digestEnabled: false,
  searchRerank: false,
  blend: { rule: 0, cf: 0, embedding: 0, llm: 0, ...weights },
  cacheTtlSeconds: 3600,
});

describe('blendScores', () => {
  it('returns zero score and no reasons when total weight is zero', () => {
    const out = blendScores(
      [{ name: 'rule', result: { score: 90, reasons: [{ kind: 'fresh', label: 'a' }] } }],
      cfg({ rule: 0, cf: 0 })
    );
    expect(out.score).toBe(0);
    expect(out.reasons).toEqual([]);
  });

  it('weights scorers by their configured weight', () => {
    const out = blendScores(
      [
        { name: 'rule', result: { score: 100, reasons: [] } },
        { name: 'cf', result: { score: 0, reasons: [] } },
      ],
      cfg({ rule: 0.6, cf: 0.4 })
    );
    // 100 * 0.6 + 0 * 0.4 = 60; normalised by total weight (1.0) = 60
    expect(out.score).toBe(60);
  });

  it('only surfaces reasons from the rule scorer', () => {
    const out = blendScores(
      [
        {
          name: 'rule',
          result: {
            score: 80,
            reasons: [
              { kind: 'pref_match', label: 'a' },
              { kind: 'fresh', label: 'b' },
            ],
          },
        },
        {
          name: 'cf',
          result: { score: 70, reasons: [{ kind: 'similar_to_liked', label: 'ignored' }] },
        },
      ],
      cfg({ rule: 0.6, cf: 0.4 })
    );
    expect(out.reasons.map(r => r.label)).toEqual(['a', 'b']);
  });

  it('caps reasons at 3', () => {
    const out = blendScores(
      [
        {
          name: 'rule',
          result: {
            score: 80,
            reasons: [
              { kind: 'pref_match', label: 'a' },
              { kind: 'pref_match', label: 'b' },
              { kind: 'lifestyle', label: 'c' },
              { kind: 'fresh', label: 'd' },
            ],
          },
        },
      ],
      cfg({ rule: 1, cf: 0 })
    );
    expect(out.reasons).toHaveLength(3);
  });
});
