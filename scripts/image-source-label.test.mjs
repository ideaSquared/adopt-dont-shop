import { readFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import { describe, expect, it } from 'vitest';

const REPO_ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const SOURCE_LABEL =
  /^LABEL org\.opencontainers\.image\.source="https:\/\/github\.com\/ideaSquared\/adopt-dont-shop"$/m;

// The text of the stage deploy.yml publishes (`--target production`): from its
// FROM line to the next FROM, or to the end of the file.
const productionStage = dockerfile => {
  const text = readFileSync(join(REPO_ROOT, dockerfile), 'utf8');
  const start = text.search(/^FROM .* AS production$/m);
  const rest = text.slice(start + 1);
  const next = rest.search(/^FROM /m);
  return next === -1 ? rest : rest.slice(0, next);
};

// deploy.yml pushes these images to GHCR with the workflow's GITHUB_TOKEN. A
// package's first push only gets access through that token when the image
// names its source repository, so an image without the label is refused
// ("denied") the first time its package has to be created.
describe('published images name their source repository', () => {
  it.each(['Dockerfile.service', 'Dockerfile.app'])(
    '%s production stage carries org.opencontainers.image.source',
    dockerfile => {
      expect(productionStage(dockerfile)).toMatch(SOURCE_LABEL);
    }
  );
});
