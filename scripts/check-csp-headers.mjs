#!/usr/bin/env node
/**
 * CSP regression guard (ADS-847, extended by ADS-958).
 *
 * Three checks:
 *  1. The nginx security-headers.conf baked into Dockerfile.app does not
 *     contain `unsafe-inline` in style-src. The codebase migrated from
 *     styled-components (which required unsafe-inline) to vanilla-extract;
 *     this check prevents backsliding.
 *  2. No Content-Security-Policy header anywhere in the repo's nginx configs
 *     (Dockerfile.app, deploy/gateway/nginx.conf, nginx/nginx.conf,
 *     nginx/nginx.prod.conf, apps/*\/nginx.conf) contains `unsafe-inline` or
 *     `unsafe-eval` in script-src.
 *  3. Every production SPA vhost in deploy/gateway/nginx.conf (the main
 *     client, admin, and rescue server blocks) declares a
 *     Content-Security-Policy header.
 *
 * Run via `node scripts/check-csp-headers.mjs` or wired into ci.yml.
 */
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');

// Extract every Content-Security-Policy header value from a config's text.
const extractPolicies = text => {
  const cspPattern = /add_header Content-Security-Policy "([^"]+)"/g;
  const policies = [];
  let match;
  while ((match = cspPattern.exec(text)) !== null) {
    policies.push(match[1]);
  }
  return policies;
};

// Every nginx-ish config in the repo that carries a Content-Security-Policy
// header, read once and reused by both the style-src and script-src checks.
const cspSources = [
  { label: 'Dockerfile.app', path: 'Dockerfile.app' },
  { label: 'deploy/gateway/nginx.conf', path: 'deploy/gateway/nginx.conf' },
  { label: 'nginx/nginx.conf', path: 'nginx/nginx.conf' },
  { label: 'nginx/nginx.prod.conf', path: 'nginx/nginx.prod.conf' },
  { label: 'apps/client/nginx.conf', path: 'apps/client/nginx.conf' },
  { label: 'apps/admin/nginx.conf', path: 'apps/admin/nginx.conf' },
  { label: 'apps/rescue/nginx.conf', path: 'apps/rescue/nginx.conf' },
].map(source => {
  const text = readFileSync(join(ROOT, source.path), 'utf8');
  return { ...source, text, policies: extractPolicies(text) };
});

const dockerfileSource = cspSources.find(s => s.path === 'Dockerfile.app');

if (dockerfileSource.policies.length === 0) {
  console.error('ERROR: No Content-Security-Policy header found in Dockerfile.app');
  process.exit(1);
}

const failures = [];

// Check 1 (ADS-847): style-src in Dockerfile.app must not carry unsafe-inline.
for (const policy of dockerfileSource.policies) {
  const styleSrcMatch = policy.match(/style-src\s+([^;]+)/);
  if (!styleSrcMatch) continue;
  if (styleSrcMatch[1].includes("'unsafe-inline'")) {
    failures.push(`Dockerfile.app: style-src contains 'unsafe-inline': ${policy}`);
  }
}

// Check 2 (ADS-958): no CSP anywhere may allow unsafe-inline/unsafe-eval in
// script-src. The codebase migrated to vanilla-extract (CSS) and ships no
// inline <script> tags, so script-src 'self' is sufficient everywhere.
for (const source of cspSources) {
  for (const policy of source.policies) {
    const scriptSrcMatch = policy.match(/script-src\s+([^;]+)/);
    if (!scriptSrcMatch) continue;
    const scriptSrc = scriptSrcMatch[1];
    if (scriptSrc.includes("'unsafe-inline'") || scriptSrc.includes("'unsafe-eval'")) {
      failures.push(`${source.label}: script-src contains unsafe-inline/unsafe-eval: ${policy}`);
    }
  }
}

// Check 3 (ADS-958): every prod SPA vhost in deploy/gateway/nginx.conf must
// declare its own CSP header (nginx does not inherit add_header from a
// sibling server block).
const gatewayNginxConf = cspSources.find(s => s.path === 'deploy/gateway/nginx.conf').text;
// Split on top-level `    server {` block boundaries so each chunk is one vhost.
const serverBlocks = gatewayNginxConf.split(/\n(?=    server \{)/);

const PROD_SPA_HOSTNAMES = [
  'adoptdontshop.com',
  'admin.adoptdontshop.com',
  'rescue.adoptdontshop.com',
];

for (const hostname of PROD_SPA_HOSTNAMES) {
  const block = serverBlocks.find(b => {
    const match = b.match(/server_name\s+([^;]+);/);
    if (!match) return false;
    // Exclude the staging vhosts (e.g. staging-admin.adoptdontshop.com) —
    // they don't literally equal the prod hostname.
    const names = match[1].trim().split(/\s+/);
    return names.includes(hostname);
  });
  if (!block) {
    failures.push(
      `deploy/gateway/nginx.conf: no server block found for prod SPA host "${hostname}"`
    );
    continue;
  }
  if (!/add_header Content-Security-Policy "/.test(block)) {
    failures.push(
      `deploy/gateway/nginx.conf: prod SPA host "${hostname}" has no Content-Security-Policy header`
    );
  }
}

if (failures.length > 0) {
  console.error('CSP regression detected:');
  for (const f of failures) console.error(`  ${f}`);
  console.error(
    '\nThe codebase uses vanilla-extract for styling and ships no inline <script> tags —',
    "\n'unsafe-inline'/'unsafe-eval' are not needed in style-src or script-src, and every",
    '\nprod SPA vhost at the edge must declare its own CSP. [ADS-847, ADS-958]'
  );
  process.exit(1);
}

const totalPolicies = cspSources.reduce((sum, source) => sum + source.policies.length, 0);
console.log(
  `✓ CSP headers are clean (${totalPolicies} polic${totalPolicies === 1 ? 'y' : 'ies'} checked, ${PROD_SPA_HOSTNAMES.length} prod SPA vhosts verified)`
);
