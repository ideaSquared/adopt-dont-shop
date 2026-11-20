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
//   node scripts/smoke-reuse.mjs push-candidates   tags and pushes service-<name>:smoke as :<SHA>-candidate and
//                                                  outputs the pushed digests (candidate_refs)
//   node scripts/smoke-reuse.mjs promote           copies those exact digests (CANDIDATE_REFS) to :<SHA> and
//                                                  writes them to REFS_FILE to sign
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

// `repo/image:tag` or `repo/image@digest` without the tag or digest (a registry port is not a tag).
const imageOf = ref => {
  const at = ref.indexOf('@');
  if (at !== -1) return ref.slice(0, at);
  const colon = ref.lastIndexOf(':');
  return colon > ref.lastIndexOf('/') ? ref.slice(0, colon) : ref;
};

const DIGEST_REF = /@sha256:[0-9a-f]+$/;

// The immutable `image@digest` docker recorded when it pushed `taggedRef` (from `docker inspect`'s RepoDigests).
export const pushedDigestRef = (repoDigests, taggedRef) => {
  const image = imageOf(taggedRef);
  const ref = repoDigests.find(d => imageOf(d) === image && DIGEST_REF.test(d));
  if (ref === undefined) throw new Error(`no pushed digest for ${taggedRef}`);
  return ref;
};

// Promote each tested digest to `image:<sha>` and sign that same digest. A tag is never a source: a tag can be
// moved after the smoke test, a digest cannot.
export const promotionPlan = (testedRefs, sha) =>
  SERVICES.map(svc => {
    const ref = testedRefs.find(r => imageOf(r).endsWith(`/service-${svc}`));
    if (ref === undefined || !DIGEST_REF.test(ref)) {
      throw new Error(`no tested digest for service-${svc}`);
    }
    return { src: ref, dst: `${imageOf(ref)}:${sha}`, sign: ref };
  });

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
  const refs = retagPairs({ from: 'smoke', to: `${process.env.SHA}-candidate` }).map(
    ({ src, dst }) => {
      console.log(`${src} -> ${dst}`);
      run('docker', ['tag', src, dst]);
      run('docker', ['push', dst]);
      const repoDigests = JSON.parse(
        execFileSync('docker', ['inspect', '--format', '{{json .RepoDigests}}', dst], {
          encoding: 'utf8',
        })
      );
      return pushedDigestRef(repoDigests, dst);
    }
  );
  writeOutput(`candidate_refs=${JSON.stringify(refs)}`);
  writeOutput('candidates=true');
};

const promote = () => {
  const plan = promotionPlan(JSON.parse(process.env.CANDIDATE_REFS ?? '[]'), process.env.SHA);
  plan.forEach(({ src, dst }) => {
    console.log(`${src} -> ${dst}`);
    run('docker', ['buildx', 'imagetools', 'create', '--tag', dst, src]);
  });
  writeFileSync(process.env.REFS_FILE, `${plan.map(p => p.sign).join('\n')}\n`);
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
