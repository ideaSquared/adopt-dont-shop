#!/usr/bin/env node
/**
 * Workflow container-image digest-pinning guard (ADS-1341).
 *
 * renovate.json (`pinDigests: true`) and scripts/check-docker-pinning.mjs
 * already require every third-party image in the prod/staging compose files
 * and every Dockerfile `FROM` to be pinned to an immutable `@sha256:` digest.
 * `.github/workflows/**` was not covered by either, and a workflow can pull a
 * container image by mutable tag in two ways neither of those sees:
 *
 *   - a job's `services:` block `image:` key (a container GitHub Actions
 *     starts for the job, e.g. the Postgres/PostGIS container migrations
 *     run against), and
 *   - a `docker run <image>` invocation inside a `run:` step's shell script
 *     (e.g. running Trivy against a saved image tarball).
 *
 * Both are scanned here, across every workflow file. `uses: <action>@<sha>`
 * lines are deliberately out of scope — actions are already pinned to a
 * commit SHA, a separate, already-enforced mechanism.
 *
 * Run via `node scripts/check-workflow-image-pinning.mjs` or
 * `pnpm check:workflow-pinning` (wired into `ci:local`, next to
 * `check:docker-pinning`).
 */
import { readFileSync, readdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const WORKFLOWS_DIR = join(ROOT, '.github', 'workflows');

// Mirrors check-docker-pinning.mjs: first-party images are pinned by
// DEPLOY_SHA/tag, not a digest, so they're out of scope here too.
const FIRST_PARTY_PREFIX = 'ghcr.io/ideasquared/';

// A `docker run` image reference: `name[/name...]:tag[@sha256:<64 hex>]`.
// The `:tag` is deliberately required — it's what lets a single left-to-right
// token scan pick the image out of a `docker run` invocation's flags without
// a docker-CLI flag-arity table: a `-v`/`-w` mount or workdir value starts
// with `$` or `/`, and an `-e KEY=value` pair either starts uppercase or
// contains `=`, so none of them can match this shape.
const IMAGE_REF_TOKEN =
  /^[a-z0-9]+(?:[._-][a-z0-9]+)*(?:\/[a-z0-9]+(?:[._-][a-z0-9]+)*)*:[A-Za-z0-9]+(?:[._-][A-Za-z0-9]+)*(?:@sha256:[0-9a-f]{64})?$/;

export function listWorkflowFiles(dir = WORKFLOWS_DIR) {
  return readdirSync(dir)
    .filter(name => /\.ya?ml$/.test(name))
    .sort();
}

// `services:`/job-container `image:` keys — the same shape
// check-docker-pinning.mjs's findUnpinnedImages checks in compose files,
// applied to every workflow file instead.
export function findUnpinnedServiceImages(file, dir = WORKFLOWS_DIR) {
  const lines = readFileSync(join(dir, file), 'utf8').split('\n');
  const failures = [];
  lines.forEach((line, index) => {
    const match = line.match(/^\s*image:\s*(\S+)\s*$/);
    if (!match) return;
    const ref = match[1];
    if (ref.startsWith(FIRST_PARTY_PREFIX)) return;
    if (ref.includes('@sha256:')) return;
    failures.push({ file, line: index + 1, ref });
  });
  return failures;
}

// Minimal shell-word tokenizer: splits on whitespace but keeps a
// single/double-quoted run (which may itself contain spaces, e.g. an
// `--entrypoint` command string) as one token, quotes stripped.
function tokenizeShellLine(line) {
  const tokens = [];
  const re = /"([^"]*)"|'([^']*)'|(\S+)/g;
  let match;
  while ((match = re.exec(line))) {
    tokens.push(match[1] ?? match[2] ?? match[3]);
  }
  return tokens;
}

// `docker run <image>` invocations, possibly spread over several
// `\`-continued lines. Collects every token in the (possibly multi-line)
// invocation and reports the first one shaped like an image reference,
// unless it's already pinned (or a first-party image, skipped like above).
export function findUnpinnedDockerRunImages(file, dir = WORKFLOWS_DIR) {
  const lines = readFileSync(join(dir, file), 'utf8').split('\n');
  const failures = [];
  let i = 0;
  while (i < lines.length) {
    if (!/^docker run(?:\s|$)/.test(lines[i].trim())) {
      i += 1;
      continue;
    }

    const chain = [];
    let j = i;
    for (;;) {
      const raw = lines[j];
      const continues = /\\\s*$/.test(raw);
      const content = continues ? raw.replace(/\\\s*$/, '') : raw;
      tokenizeShellLine(content).forEach(token => chain.push({ token, line: j + 1 }));
      if (!continues) break;
      j += 1;
      if (j >= lines.length) break;
    }

    const imageToken = chain.find(({ token }) => IMAGE_REF_TOKEN.test(token));
    const ref = imageToken?.token;
    const isPinned = !ref || ref.startsWith(FIRST_PARTY_PREFIX) || ref.includes('@sha256:');
    if (!isPinned) failures.push({ file, line: imageToken.line, ref });

    i = j + 1;
  }
  return failures;
}

function main() {
  const failures = listWorkflowFiles().flatMap(file => [
    ...findUnpinnedServiceImages(file),
    ...findUnpinnedDockerRunImages(file),
  ]);

  if (failures.length === 0) {
    console.log('OK — every container-image reference in .github/workflows is digest-pinned.');
    return;
  }

  console.error('Unpinned container image reference(s) detected in .github/workflows:');
  for (const { file, line, ref } of failures) {
    console.error(`  - .github/workflows/${file}:${line} — ${ref}`);
  }
  console.error('');
  console.error('Pin each to an immutable digest, e.g.:');
  console.error(
    "  docker manifest inspect <image> | jq -r '.config.digest' (or the Docker-Content-Digest header)"
  );
  console.error('  image: postgis/postgis:16-3.4@sha256:<digest>');
  console.error('  docker run ... aquasec/trivy:0.63.0@sha256:<digest> ...');
  process.exit(1);
}

// Only run when executed directly (`node scripts/check-workflow-image-pinning.mjs`),
// not when imported by the test file.
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main();
}
