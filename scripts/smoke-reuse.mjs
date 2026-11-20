#!/usr/bin/env node
// Lets docker.yml skip rebuilding and re-booting the production stack on a push to main that changed
// nothing an image or the smoke test is made from (docs, CI scripts, other workflows, ...). Such a
// commit's images would be byte-for-byte the previous commit's, so its production smoke test passing
// still holds, and its signed service images can be copied to the new commit's tag by digest instead
// of being rebuilt (the cosign signatures are on the digest, so they carry over).
//
//   node scripts/smoke-reuse.mjs decide   writes reuse=true|false to GITHUB_OUTPUT
//   node scripts/smoke-reuse.mjs retag    copies service-<name>:<BEFORE> to service-<name>:<SHA> in GHCR
//
// Any doubt (an image or smoke input changed, the previous smoke test did not pass, a failed lookup)
// means the full build and boot, never a skipped one.

import { execFileSync } from 'node:child_process';
import { appendFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';

// Same list as the `services` target in docker-bake.hcl (a test keeps them in step).
export const SERVICES = [
  'gateway',
  'auth',
  'notifications',
  'pets',
  'rescue',
  'applications',
  'chat',
  'moderation',
  'matching',
  'audit',
  'cms',
  'ops',
];

const SMOKE_CHECK = 'Production Image Smoke (boot)';
const PREFIX = 'ghcr.io/ideasquared/adopt-dont-shop';

const short = sha => sha.slice(0, 7);

export const reuseDecision = ({ event, ref, imageChanged, deployChanged, before, checkRuns }) => {
  if (event !== 'push' || ref !== 'refs/heads/main') {
    return { reuse: false, reason: 'not a push to main: running the full smoke test' };
  }
  if (imageChanged === 'true' || deployChanged === 'true') {
    return {
      reuse: false,
      reason: 'an image or smoke-test input changed: running the full smoke test',
    };
  }
  if (!before || /^0+$/.test(before)) {
    return { reuse: false, reason: 'no previous commit to reuse: running the full smoke test' };
  }
  const latest = checkRuns?.check_runs?.[0];
  if (latest?.status !== 'completed' || latest.conclusion !== 'success') {
    return {
      reuse: false,
      reason: `the smoke test did not pass on ${short(before)}: running the full smoke test`,
    };
  }
  return {
    reuse: true,
    reason: `no image or smoke-test input changed since ${short(before)}, whose smoke test passed: reusing it`,
  };
};

export const retagPairs = ({ prefix = PREFIX, from, to }) =>
  SERVICES.map(svc => ({
    src: `${prefix}/service-${svc}:${from}`,
    dst: `${prefix}/service-${svc}:${to}`,
  }));

const fetchCheckRuns = async ({ repo, sha, token }) => {
  const url = `https://api.github.com/repos/${repo}/commits/${sha}/check-runs?check_name=${encodeURIComponent(SMOKE_CHECK)}`;
  const res = await fetch(url, {
    headers: { authorization: `Bearer ${token}`, accept: 'application/vnd.github+json' },
  });
  return res.ok ? res.json() : undefined;
};

const writeOutput = line => {
  if (process.env.GITHUB_OUTPUT) appendFileSync(process.env.GITHUB_OUTPUT, `${line}\n`);
};

const decide = async () => {
  const env = process.env;
  const needsLookup = env.IMAGE_CHANGED !== 'true' && env.DEPLOY_CHANGED !== 'true' && env.BEFORE;
  const checkRuns = needsLookup
    ? await fetchCheckRuns({
        repo: env.GITHUB_REPOSITORY,
        sha: env.BEFORE,
        token: env.GH_TOKEN,
      }).catch(() => undefined)
    : undefined;
  const { reuse, reason } = reuseDecision({
    event: env.EVENT,
    ref: env.REF,
    imageChanged: env.IMAGE_CHANGED,
    deployChanged: env.DEPLOY_CHANGED,
    before: env.BEFORE,
    checkRuns,
  });
  console.log(reason);
  writeOutput(`reuse=${reuse}`);
};

const retag = () => {
  retagPairs({ from: process.env.BEFORE, to: process.env.SHA }).forEach(({ src, dst }) => {
    console.log(`${src} -> ${dst}`);
    execFileSync('docker', ['buildx', 'imagetools', 'create', '--tag', dst, src], {
      stdio: 'inherit',
    });
  });
  writeOutput('reused=true');
};

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  const mode = process.argv[2];
  if (mode === 'decide') await decide();
  else if (mode === 'retag') retag();
  else {
    console.error('usage: smoke-reuse.mjs decide|retag');
    process.exit(2);
  }
}
