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
// It also lets a full run build the service images once. After the smoke test passes, the smoke job
// pushes the exact images it booted as service-<name>:<SHA>-candidate; once the Trivy scans have also
// passed, the publish job promotes them to service-<name>:<SHA> and signs them, instead of building
// all 12 again. A candidate tag is never deployable: deploy.yml only pulls :<SHA> with a valid
// signature.
//
//   node scripts/smoke-reuse.mjs push-candidates   tags and pushes service-<name>:smoke as :<SHA>-candidate
//   node scripts/smoke-reuse.mjs promote           copies :<SHA>-candidate to :<SHA>, writes the digest refs
//                                                  to sign to REFS_FILE
//
// Any doubt (an image or smoke input changed, the previous smoke test did not pass, a failed lookup)
// means the full build and boot, never a skipped one.

import { execFileSync } from 'node:child_process';
import { appendFileSync, writeFileSync } from 'node:fs';
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

// `image:tag` with a manifest digest becomes `image@digest`, the immutable reference cosign signs.
export const digestRef = (ref, digest) => {
  if (!/^sha256:[0-9a-f]+$/.test(digest)) throw new Error(`not a digest: '${digest}'`);
  const tagAt = ref.lastIndexOf(':');
  const image = tagAt > ref.lastIndexOf('/') ? ref.slice(0, tagAt) : ref;
  return `${image}@${digest}`;
};

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

const run = (cmd, args) => execFileSync(cmd, args, { stdio: 'inherit' });

const pushCandidates = () => {
  retagPairs({ from: 'smoke', to: `${process.env.SHA}-candidate` }).forEach(({ src, dst }) => {
    console.log(`${src} -> ${dst}`);
    run('docker', ['tag', src, dst]);
    run('docker', ['push', dst]);
  });
  writeOutput('candidates=true');
};

const promote = () => {
  const sha = process.env.SHA;
  const refs = retagPairs({ from: `${sha}-candidate`, to: sha }).map(({ src, dst }) => {
    console.log(`${src} -> ${dst}`);
    run('docker', ['buildx', 'imagetools', 'create', '--tag', dst, src]);
    const digest = execFileSync(
      'docker',
      ['buildx', 'imagetools', 'inspect', dst, '--format', '{{json .Manifest}}'],
      { encoding: 'utf8' }
    );
    return digestRef(dst, JSON.parse(digest).digest);
  });
  writeFileSync(process.env.REFS_FILE, `${refs.join('\n')}\n`);
  writeOutput('promoted=true');
};

const MODES = { decide, retag, 'push-candidates': pushCandidates, promote };

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  const mode = MODES[process.argv[2]];
  if (mode === undefined) {
    console.error(`usage: smoke-reuse.mjs ${Object.keys(MODES).join('|')}`);
    process.exit(2);
  }
  await mode();
}
