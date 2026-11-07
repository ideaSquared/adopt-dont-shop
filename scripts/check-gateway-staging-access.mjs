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

const GUARD_INCLUDE = /^\s*include\s+\/etc\/nginx\/snippets\/staging-access\.conf\s*;/m;

const stripComments = text => text.replace(/#.*$/gm, '');

const serverBlocks = text => stripComments(text).split(/\n(?=\s*server\s*\{)/);

const serverNames = block => {
  const match = block.match(/server_name\s+([^;]+);/);
  return match ? match[1].trim().split(/\s+/) : [];
};

const isHttps = block => /listen\s+443\b/.test(block);

export function findUnprotectedStagingHosts(text) {
  return serverBlocks(text)
    .filter(isHttps)
    .filter(block => !GUARD_INCLUDE.test(block))
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
  return REQUIRED_SNIPPET_DIRECTIVES.filter(([, pattern]) => !pattern.test(live)).map(
    ([label]) => `missing "${label}"`
  );
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
