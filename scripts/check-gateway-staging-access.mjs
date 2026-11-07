#!/usr/bin/env node
/**
 * Staging access guard for the shared edge gateway.
 *
 * Staging runs real application code on public DNS names, so every staging
 * HTTPS vhost in deploy/gateway/nginx.conf must include
 * snippets/staging-access.conf: allowlisted IPs pass, everyone else needs a
 * basic-auth password. A new staging vhost added without that include would
 * be open to the internet; this check fails CI when that happens.
 *
 * Run via `node scripts/check-gateway-staging-access.mjs` or
 * `pnpm check:gateway-staging-access` (wired into `ci:local` and CI).
 */
import { readFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const CONF_PATH = 'deploy/gateway/nginx.conf';
const SNIPPET_PATH = 'deploy/gateway/snippets/staging-access.conf';

const GUARD_INCLUDE = /^\s*include\s+\/etc\/nginx\/snippets\/staging-access\.conf\s*;/;

const stripComments = text => text.replace(/#.*$/gm, '');

const serverBlocks = text => stripComments(text).split(/\n(?=\s*server\s*\{)/);

const serverNames = block => {
  const match = block.match(/server_name\s+([^;]+);/);
  return match ? match[1].trim().split(/\s+/) : [];
};

// Matches `listen 443`, `listen [::]:443` and `listen 0.0.0.0:443`.
const isHttps = block => /listen\s+(?:\S*:)?443\b/.test(block);

// The lines directly inside the server block (brace depth 1), so an include
// that only covers one `location` does not count for the whole vhost.
const serverScopeLines = block =>
  block.split('\n').reduce(
    ({ depth, lines }, line) => {
      const next = depth + (line.match(/\{/g) ?? []).length - (line.match(/\}/g) ?? []).length;
      return { depth: next, lines: depth === 1 ? [...lines, line] : lines };
    },
    { depth: 0, lines: [] }
  ).lines;

const hasServerScopeGuard = block => serverScopeLines(block).some(line => GUARD_INCLUDE.test(line));

export function findUnprotectedStagingHosts(text) {
  return serverBlocks(text)
    .filter(isHttps)
    .filter(block => !hasServerScopeGuard(block))
    .flatMap(serverNames)
    .filter(name => name.startsWith('staging'));
}

const REQUIRED_SNIPPET_DIRECTIVES = [
  ['satisfy any;', /^\s*satisfy\s+any\s*;/m],
  ['deny all;', /^\s*deny\s+all\s*;/m],
  ['auth_basic', /^\s*auth_basic\s+"/m],
  ['auth_basic_user_file', /^\s*auth_basic_user_file\s+\S+\s*;/m],
];

export function findSnippetProblems(text) {
  const live = stripComments(text);
  const missing = REQUIRED_SNIPPET_DIRECTIVES.filter(([, pattern]) => !pattern.test(live)).map(
    ([label]) => `missing "${label}"`
  );
  // nginx applies the first matching allow/deny; with `satisfy any`, an
  // `allow all;` lets everyone in without a password.
  const forbidden = /^\s*allow\s+all\s*;/m.test(live) ? ['must not contain "allow all;"'] : [];
  return [...missing, ...forbidden];
}

function main() {
  const unprotected = findUnprotectedStagingHosts(readFileSync(join(ROOT, CONF_PATH), 'utf8'));
  const snippetProblems = findSnippetProblems(readFileSync(join(ROOT, SNIPPET_PATH), 'utf8'));

  if (unprotected.length === 0 && snippetProblems.length === 0) {
    console.log(`OK — every staging vhost in ${CONF_PATH} is behind ${SNIPPET_PATH}.`);
    return;
  }

  unprotected.forEach(host =>
    console.error(`${CONF_PATH}: ${host} must "include /etc/nginx/snippets/staging-access.conf;"`)
  );
  snippetProblems.forEach(problem => console.error(`${SNIPPET_PATH}: ${problem}`));
  process.exit(1);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main();
}
