import { readFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import { describe, expect, it } from 'vitest';

const CONFIG = join(dirname(fileURLToPath(import.meta.url)), '..', '.github', 'dependabot.yml');

// Group names and their pattern lines of the first (npm) update block. Dependabot gives a package
// to the first group that matches it, so order matters; dependabot.yml is read as text because the
// check scripts run without a YAML dependency.
function npmGroups() {
  const text = readFileSync(CONFIG, 'utf8');
  const npmBlock = text.split(/^ {2}- package-ecosystem: /m)[1] ?? '';
  const groupsBlock = npmBlock.split(/^ {4}groups:\n/m)[1] ?? '';
  return groupsBlock
    .split(/^ {6}(?=[\w-]+:\n)/m)
    .filter(Boolean)
    .map(chunk => ({
      name: chunk.split(':')[0],
      patterns: chunk.match(/patterns: \[(.*)\]/)?.[1] ?? '',
    }));
}

describe('dependabot.yml npm groups', () => {
  const groups = npmGroups();
  const names = groups.map(group => group.name);

  it('moves vitest and its @vitest/* peers in one PR', () => {
    const vitest = groups.find(group => group.name === 'vitest');

    expect(vitest?.patterns).toContain("'vitest'");
    expect(vitest?.patterns).toContain("'@vitest/*'");
  });

  it('puts prettier in its own group ahead of the catch-all', () => {
    const prettier = groups.find(group => group.name === 'prettier');

    expect(prettier?.patterns).toBe("'prettier'");
    expect(names.indexOf('prettier')).toBeLessThan(names.indexOf('minor-and-patch'));
  });
});
