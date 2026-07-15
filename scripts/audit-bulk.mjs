#!/usr/bin/env node
// Dependency audit via npm's bulk advisory endpoint.
//
// Why this exists: `pnpm audit` calls npm's *quick-audit* endpoint
// (`/-/npm/v1/security/audits/quick`), which npm retired — it now returns
// HTTP 410 for every request, so `pnpm audit --audit-level high` fails on
// every CI run regardless of the dependency tree. npm's guidance is to use
// the *bulk advisory* endpoint (`/-/npm/v1/security/advisories/bulk`), which
// this script queries directly against the versions resolved in
// pnpm-lock.yaml.
//
// Behaviour preserves the ADS-903 policy:
//   - EVERY matched advisory (all severities) is printed to the job summary
//     and stdout — advisory visibility.
//   - The process exits non-zero when any matched advisory is `high` or
//     `critical` — the hard merge gate (mirrors `--audit-level high`).
//
// Fails closed: a registry/network error after retries exits non-zero rather
// than letting an un-audited build pass.

import { readFileSync, appendFileSync } from 'node:fs';

import semver from 'semver';

const BULK_ENDPOINT = 'https://registry.npmjs.org/-/npm/v1/security/advisories/bulk';
const GATE_SEVERITIES = new Set(['high', 'critical']);
const BATCH_SIZE = 200;
const MAX_RETRIES = 3;

// Extract name -> Set(versions) from the `packages:` section of the v9
// lockfile. Keys look like `'@scope/name@1.2.3':` or `'name@1.2.3':`, with an
// occasional `(peerdep@x)` suffix on the version that we strip.
const parseLockfilePackages = (lockfile) => {
  const byName = new Map();
  let inPackages = false;
  for (const rawLine of lockfile.split('\n')) {
    if (rawLine === 'packages:') {
      inPackages = true;
      continue;
    }
    // A new top-level key (no indentation) ends the packages section.
    if (inPackages && /^\S/.test(rawLine)) {
      break;
    }
    if (!inPackages) {
      continue;
    }
    const match = rawLine.match(/^ {2}'?(.+?)'?:$/);
    if (!match) {
      continue;
    }
    const key = match[1];
    const at = key.lastIndexOf('@');
    if (at <= 0) {
      continue;
    }
    const name = key.slice(0, at);
    const version = key.slice(at + 1).split('(')[0];
    if (!semver.valid(version)) {
      continue;
    }
    const versions = byName.get(name) ?? new Set();
    versions.add(version);
    byName.set(name, versions);
  }
  return byName;
};

const chunk = (items, size) => {
  const out = [];
  for (let i = 0; i < items.length; i += size) {
    out.push(items.slice(i, i + size));
  }
  return out;
};

const fetchAdvisories = async (payload) => {
  for (let attempt = 1; attempt <= MAX_RETRIES; attempt += 1) {
    try {
      const res = await fetch(BULK_ENDPOINT, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        throw new Error(`bulk advisory endpoint responded ${res.status}`);
      }
      return await res.json();
    } catch (error) {
      if (attempt === MAX_RETRIES) {
        throw error;
      }
      await new Promise((resolve) => setTimeout(resolve, attempt * 1000));
    }
  }
  return {};
};

// Match each returned advisory against the versions we actually have installed
// (the endpoint returns advisories for a package name across all versions).
const collectFindings = (advisoriesByName, versionsByName) => {
  const findings = [];
  for (const [name, advisories] of Object.entries(advisoriesByName)) {
    const installed = versionsByName.get(name);
    if (!installed) {
      continue;
    }
    for (const advisory of advisories) {
      for (const version of installed) {
        if (!semver.satisfies(version, advisory.vulnerable_versions, { includePrerelease: true })) {
          continue;
        }
        findings.push({
          name,
          version,
          severity: String(advisory.severity ?? 'unknown').toLowerCase(),
          title: advisory.title ?? '',
          url: advisory.url ?? '',
        });
      }
    }
  }
  return findings;
};

const writeSummary = (findings) => {
  const lines = [];
  lines.push('## Dependency audit (npm bulk advisory endpoint)');
  if (findings.length === 0) {
    lines.push('');
    lines.push('No advisories match the installed dependency versions.');
  } else {
    lines.push('');
    lines.push('| Severity | Package | Installed | Advisory |');
    lines.push('| --- | --- | --- | --- |');
    const order = { critical: 0, high: 1, moderate: 2, low: 3, unknown: 4 };
    const sorted = [...findings].sort(
      (a, b) => (order[a.severity] ?? 5) - (order[b.severity] ?? 5)
    );
    for (const f of sorted) {
      lines.push(`| ${f.severity} | \`${f.name}\` | ${f.version} | [${f.title}](${f.url}) |`);
    }
  }
  const body = `${lines.join('\n')}\n`;
  process.stdout.write(body);
  if (process.env.GITHUB_STEP_SUMMARY) {
    appendFileSync(process.env.GITHUB_STEP_SUMMARY, body);
  }
};

const main = async () => {
  const lockfile = readFileSync('pnpm-lock.yaml', 'utf8');
  const versionsByName = parseLockfilePackages(lockfile);
  const names = [...versionsByName.keys()];

  const advisoriesByName = {};
  for (const batch of chunk(names, BATCH_SIZE)) {
    const payload = Object.fromEntries(batch.map((name) => [name, [...versionsByName.get(name)]]));
    const result = await fetchAdvisories(payload);
    Object.assign(advisoriesByName, result);
  }

  const findings = collectFindings(advisoriesByName, versionsByName);
  writeSummary(findings);

  const blocking = findings.filter((f) => GATE_SEVERITIES.has(f.severity));
  if (blocking.length > 0) {
    const unique = new Set(blocking.map((f) => `${f.name}@${f.version}`));
    console.error(
      `\n::error::${blocking.length} high/critical advisory match(es) across ${unique.size} package version(s) — see the summary above.`
    );
    process.exit(1);
  }
};

main().catch((error) => {
  console.error(`::error::dependency audit failed: ${error.message}`);
  process.exit(1);
});
