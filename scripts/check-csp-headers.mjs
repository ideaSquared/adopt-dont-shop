#!/usr/bin/env node
/**
 * CSP regression guard (ADS-847, extended by ADS-958 and ADS-1382).
 *
 * Six checks:
 *  1. The nginx security-headers.conf baked into Dockerfile.app does not
 *     contain `unsafe-inline` in style-src. The codebase migrated from
 *     styled-components (which required unsafe-inline) to vanilla-extract;
 *     this check prevents backsliding.
 *  2. No Content-Security-Policy header anywhere in the repo's nginx configs
 *     (Dockerfile.app, deploy/gateway/nginx.conf and its apex snippets,
 *     nginx/nginx.conf, nginx/nginx.prod.conf) contains `unsafe-inline` or
 *     `unsafe-eval` in script-src.
 *  3. Every SPA vhost at the edge (prod and staging client, admin and rescue
 *     server blocks) declares a Content-Security-Policy header.
 *  4. Every X-XSS-Protection header in the repo's nginx configs (the above
 *     plus nginx/security-headers.conf) is "0". The legacy "1; mode=block" is
 *     deprecated, can itself introduce XSS on some engines, and would conflict
 *     with the edge's "0".
 *  5. Every SPA CSP (the edge SPA vhosts, the app-container nginx and
 *     nginx/nginx.prod.conf) allows the third parties the SPAs load: Google
 *     Fonts, Statsig and hosted Sentry. Browsers enforce the edge and
 *     app-container CSPs together, so a missing origin in either silently
 *     breaks fonts, feature flags or error reporting.
 *  6. deploy/gateway/nginx.conf includes exactly one apex snippet
 *     (apex-landing.conf or apex-production.conf).
 *
 * Run via `node scripts/check-csp-headers.mjs` or wired into ci.yml.
 */
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');

// Extract every Content-Security-Policy header value from a config's text.
export const extractPolicies = text => {
  const cspPattern = /add_header Content-Security-Policy "([^"]+)"/g;
  const policies = [];
  let match;
  while ((match = cspPattern.exec(text)) !== null) {
    policies.push(match[1]);
  }
  return policies;
};

// Third-party origins every SPA CSP must allow, as [directive, origin].
// - Google Fonts: apps/*/index.html load the stylesheet from fonts.googleapis.com
//   and the font files from fonts.gstatic.com.
// - Statsig: default endpoints in @statsig/client-core (NetworkConfig.js:
//   initialize + rgstr; ErrorBoundary.js: sdk_exception is statsigapi.net).
// - Sentry: hosted ingest, US and EU. A self-hosted GlitchTip DSN host would
//   need adding to every CSP and to this list.
export const REQUIRED_ORIGINS = [
  ['style-src', 'https://fonts.googleapis.com'],
  ['font-src', 'https://fonts.gstatic.com'],
  ['connect-src', 'https://featureassets.org'],
  ['connect-src', 'https://prodregistryv2.org'],
  ['connect-src', 'https://statsigapi.net'],
  ['connect-src', 'https://*.ingest.sentry.io'],
  ['connect-src', 'https://*.ingest.de.sentry.io'],
];

// "directive origin" for each required origin the policy does not allow. A
// connect-src of `https:` covers every https origin (the app-container CSP).
export const findMissingOrigins = policy =>
  REQUIRED_ORIGINS.filter(([directive, origin]) => {
    const match = policy.match(new RegExp(`(?:^|;)\\s*${directive}\\s+([^;]+)`));
    const sources = match ? match[1].trim().split(/\s+/) : [];
    const coveredByScheme = directive === 'connect-src' && sources.includes('https:');
    return !(sources.includes(origin) || coveredByScheme);
  }).map(([directive, origin]) => `${directive} ${origin}`);

// The apex vhost lives in one of two snippets; exactly one must be included.
export const findApexIncludeProblems = text => {
  const includes = text
    .replace(/#.*$/gm, '')
    .match(/include\s+\/etc\/nginx\/snippets\/apex-(?:landing|production)\.conf\s*;/g);
  const count = includes ? includes.length : 0;
  return count === 1
    ? []
    : [
        `expected exactly one apex snippet include (apex-landing.conf or apex-production.conf), found ${count}`,
      ];
};

const GATEWAY_CONF = 'deploy/gateway/nginx.conf';
const APEX_LANDING = 'deploy/gateway/snippets/apex-landing.conf';
const APEX_PRODUCTION = 'deploy/gateway/snippets/apex-production.conf';

const PROD_SPA_HOSTNAMES = [
  'adoptdontshop.app',
  'admin.adoptdontshop.app',
  'rescue.adoptdontshop.app',
];
const STAGING_SPA_HOSTNAMES = [
  'staging.adoptdontshop.app',
  'staging-admin.adoptdontshop.app',
  'staging-rescue.adoptdontshop.app',
];

function main() {
  // Every nginx-ish config in the repo that carries a Content-Security-Policy
  // header, read once and reused by the checks below. The apex snippets hold
  // server blocks that nginx.conf includes, so they are scanned as well.
  const cspSources = [
    { label: 'Dockerfile.app', path: 'Dockerfile.app' },
    { label: GATEWAY_CONF, path: GATEWAY_CONF },
    { label: APEX_LANDING, path: APEX_LANDING },
    { label: APEX_PRODUCTION, path: APEX_PRODUCTION },
    { label: 'nginx/nginx.conf', path: 'nginx/nginx.conf' },
    { label: 'nginx/nginx.prod.conf', path: 'nginx/nginx.prod.conf' },
  ].map(source => {
    // Dockerfile.app writes the header through a single-quoted shell echo, so
    // quotes inside the policy appear as '"'"'.
    const text = readFileSync(join(ROOT, source.path), 'utf8').replace(/'"'"'/g, "'");
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

  // Check 3 (ADS-958): every SPA vhost at the edge must declare its own CSP
  // header (nginx does not inherit add_header from a sibling server block).
  // The apex vhost may be in either snippet, so the production snippet is
  // always checked even while the landing page is live.
  const gatewayText = cspSources.find(s => s.path === GATEWAY_CONF).text;
  const apexProductionText = cspSources.find(s => s.path === APEX_PRODUCTION).text;
  // Split on top-level `    server {` block boundaries so each chunk is one vhost.
  const serverBlocks = `${gatewayText}\n${apexProductionText}`.split(/\n(?=    server \{)/);

  const findBlock = hostname =>
    serverBlocks.find(b => {
      // The :80 redirect vhost lists the same names; only the 443 vhost counts.
      if (!/listen +443[ ;]/.test(b)) return false;
      const match = b.match(/server_name\s+([^;]+);/);
      // Exact name match, so staging-admin.* never satisfies admin.*.
      return match ? match[1].trim().split(/\s+/).includes(hostname) : false;
    });

  const spaPolicies = [];
  for (const hostname of [...PROD_SPA_HOSTNAMES, ...STAGING_SPA_HOSTNAMES]) {
    const block = findBlock(hostname);
    if (!block) {
      failures.push(`${GATEWAY_CONF}: no server block found for SPA host "${hostname}"`);
      continue;
    }
    const policies = extractPolicies(block);
    if (policies.length === 0) {
      failures.push(
        `${GATEWAY_CONF}: SPA host "${hostname}" has no Content-Security-Policy header`
      );
    }
    policies.forEach(policy => spaPolicies.push({ label: `edge vhost ${hostname}`, policy }));
  }

  // Check 5: every SPA CSP allows fonts, Statsig and Sentry.
  // nginx/nginx.prod.conf also sets a JSON-only CSP on its api vhost (no wss://
  // connect-src); only the SPA policies, which carry the api wss origin, count.
  const isSpaPolicy = (source, policy) =>
    source.path !== 'nginx/nginx.prod.conf' || policy.includes('wss://');
  cspSources
    .filter(s => ['Dockerfile.app', 'nginx/nginx.prod.conf'].includes(s.path))
    .forEach(source =>
      source.policies
        .filter(policy => isSpaPolicy(source, policy))
        .forEach(policy => spaPolicies.push({ label: source.label, policy }))
    );
  for (const { label, policy } of spaPolicies) {
    for (const missing of findMissingOrigins(policy)) {
      failures.push(`${label}: CSP does not allow ${missing}`);
    }
  }

  // Check 6: exactly one apex snippet is included.
  for (const problem of findApexIncludeProblems(gatewayText)) {
    failures.push(`${GATEWAY_CONF}: ${problem}`);
  }

  // Check 4 (ADS-1382): X-XSS-Protection must be "0" everywhere. Dockerfile.app
  // once baked "1; mode=block" while the edge sent "0", so a response could carry
  // two conflicting values. nginx/security-headers.conf is the canonical set.
  const xssSources = [
    ...cspSources,
    {
      label: 'nginx/security-headers.conf',
      text: readFileSync(join(ROOT, 'nginx/security-headers.conf'), 'utf8'),
    },
  ];
  for (const source of xssSources) {
    for (const [, value] of source.text.matchAll(/add_header X-XSS-Protection "([^"]*)"/g)) {
      if (value !== '0') {
        failures.push(`${source.label}: X-XSS-Protection is "${value}", expected "0"`);
      }
    }
  }

  if (failures.length > 0) {
    console.error('CSP regression detected:');
    for (const f of failures) console.error(`  ${f}`);
    console.error(
      '\nThe codebase uses vanilla-extract for styling and ships no inline <script> tags —',
      "\n'unsafe-inline'/'unsafe-eval' are not needed in style-src or script-src, and every",
      '\nSPA vhost at the edge must declare its own CSP allowing Google Fonts, Statsig and',
      '\nSentry. X-XSS-Protection must be "0" everywhere. [ADS-847, ADS-958, ADS-1382]'
    );
    process.exit(1);
  }

  const totalPolicies = cspSources.reduce((sum, source) => sum + source.policies.length, 0);
  const spaHosts = PROD_SPA_HOSTNAMES.length + STAGING_SPA_HOSTNAMES.length;
  console.log(
    `✓ CSP headers are clean (${totalPolicies} polic${totalPolicies === 1 ? 'y' : 'ies'} checked, ${spaHosts} SPA vhosts verified)`
  );
}

// Only run when executed directly, not when imported by the test file.
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main();
}
