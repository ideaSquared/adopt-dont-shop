// The deploy host has no repo checkout: deploy.yml and rollback.yml copy an
// explicit list of files to /opt/ads/<env>. A compose file that bind-mounts a
// repo path the lists leave out still starts, because Docker creates the
// missing host path as an empty directory. That is how Prometheus came to run
// on production with no alert rules (infra/prometheus/rules was never copied).
import { readFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import { describe, expect, it } from 'vitest';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');

const DEPLOYED_COMPOSE_FILES = [
  'docker-compose.prod.yml',
  'docker-compose.staging.yml',
  'docker-compose.observability.yml',
  'docker-compose.glitchtip.yml',
];

const COPY_WORKFLOWS = ['.github/workflows/deploy.yml', '.github/workflows/rollback.yml'];

const read = path => readFileSync(join(ROOT, path), 'utf8');

// Short-syntax relative bind mounts: `- ./host/path:/container/path[:ro]`.
const relativeMountSources = composeText =>
  [...composeText.matchAll(/^\s*-\s+\.\/([^:\s]+):/gm)].map(match => match[1]);

// The appleboy/scp-action `source:` list of the step that copies deploy config.
const copiedPaths = workflowText => {
  const match = workflowText.match(/source:\s*'([^']*docker-compose\.prod\.yml[^']*)'/);
  return match ? match[1].split(',').map(path => path.trim()) : [];
};

const isCovered = (mountSource, copied) =>
  copied.some(path => mountSource === path || mountSource.startsWith(`${path}/`));

describe('deploy config copy lists', () => {
  it.each(COPY_WORKFLOWS)(
    '%s copies every repo path the deployed compose files mount',
    workflow => {
      const copied = copiedPaths(read(workflow));
      const mounts = DEPLOYED_COMPOSE_FILES.flatMap(file => relativeMountSources(read(file)));

      expect(copied.length).toBeGreaterThan(0);
      expect(mounts.length).toBeGreaterThan(0);
      expect(mounts.filter(mount => !isCovered(mount, copied))).toEqual([]);
    }
  );
});
