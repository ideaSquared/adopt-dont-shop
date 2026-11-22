import AxeBuilder from '@axe-core/playwright';
import type { Page } from '@playwright/test';

import { expect, test } from '../fixtures';
import { KNOWN_VIOLATIONS } from '../tests/a11y/known-violations';

/** WCAG 2.0, 2.1 and 2.2, levels A and AA: the rules axe can check automatically. */
export const WCAG_22_AA_TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'];

/**
 * Runs axe on the page as it is now and fails on any WCAG 2.2 AA violation,
 * except the rules `known-violations.ts` lists for this exact page.
 */
export async function expectNoAxeViolations(page: Page, pageKey: string): Promise<void> {
  const tolerated = new Set(
    KNOWN_VIOLATIONS.filter(entry => entry.page === pageKey).map(entry => entry.rule)
  );
  const results = await new AxeBuilder({ page }).withTags(WCAG_22_AA_TAGS).analyze();

  const failing = new Set(results.violations.map(v => v.id));
  [...tolerated]
    .filter(rule => !failing.has(rule))
    .forEach(rule =>
      test.info().annotations.push({
        type: 'a11y-exclusion-unused',
        description: `${pageKey}: '${rule}' no longer fails; delete it from known-violations.ts`,
      })
    );

  const unexpected = results.violations
    .filter(v => !tolerated.has(v.id))
    .map(v => ({
      id: v.id,
      impact: v.impact,
      help: v.help,
      nodes: v.nodes.map(n => ({ target: n.target, failure: n.failureSummary })),
    }));

  expect(unexpected, `${pageKey}\n${JSON.stringify(unexpected, null, 2)}`).toEqual([]);
}
