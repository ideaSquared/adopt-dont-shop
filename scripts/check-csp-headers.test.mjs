import { readFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import { describe, expect, it } from 'vitest';

import {
  extractPolicies,
  findApexIncludeProblems,
  findMissingOrigins,
  REQUIRED_ORIGINS,
} from './check-csp-headers.mjs';

const REPO_ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const read = path => readFileSync(join(REPO_ROOT, path), 'utf8');

const FULL_POLICY =
  "default-src 'self'; script-src 'self'; " +
  "style-src 'self' https://fonts.googleapis.com; " +
  "font-src 'self' data: https://fonts.gstatic.com; " +
  "connect-src 'self' https://featureassets.org https://prodregistryv2.org " +
  'https://statsigapi.net https://*.ingest.sentry.io https://*.ingest.de.sentry.io';

describe('findMissingOrigins', () => {
  it('passes a policy that allows fonts, Statsig and Sentry', () => {
    expect(findMissingOrigins(FULL_POLICY)).toEqual([]);
  });

  it('flags a policy that blocks Google Fonts', () => {
    const policy = FULL_POLICY.replace(' https://fonts.googleapis.com', '').replace(
      ' https://fonts.gstatic.com',
      ''
    );
    expect(findMissingOrigins(policy)).toEqual([
      'style-src https://fonts.googleapis.com',
      'font-src https://fonts.gstatic.com',
    ]);
  });

  it('flags a connect-src without Statsig or Sentry', () => {
    const missing = findMissingOrigins("style-src 'self'; connect-src 'self'");
    expect(missing).toContain('connect-src https://featureassets.org');
    expect(missing).toContain('connect-src https://*.ingest.sentry.io');
  });

  it('accepts the https: scheme as covering connect-src origins', () => {
    const policy = FULL_POLICY.replace(/connect-src [^;]+/, "connect-src 'self' wss: https:");
    expect(findMissingOrigins(policy)).toEqual([]);
  });

  it('does not accept an origin that only appears in another directive', () => {
    const policy = "style-src 'self'; font-src 'self' https://fonts.googleapis.com";
    expect(findMissingOrigins(policy)).toContain('style-src https://fonts.googleapis.com');
  });
});

describe('findApexIncludeProblems', () => {
  const landing = '        include /etc/nginx/snippets/apex-landing.conf;';
  const production = '        include /etc/nginx/snippets/apex-production.conf;';

  it('passes with exactly one apex snippet included', () => {
    expect(findApexIncludeProblems(landing)).toEqual([]);
    expect(findApexIncludeProblems(production)).toEqual([]);
  });

  it('flags both snippets included (duplicate server_name)', () => {
    expect(findApexIncludeProblems(`${landing}\n${production}`)).toHaveLength(1);
  });

  it('flags no apex snippet included', () => {
    expect(findApexIncludeProblems('')).toHaveLength(1);
  });

  it('ignores a commented-out include', () => {
    expect(findApexIncludeProblems(`${landing}\n# ${production.trim()}`)).toEqual([]);
  });
});

describe('repo nginx configs', () => {
  it('declares the required origins in every SPA CSP', () => {
    const spaPolicies = [
      ...extractPolicies(read('Dockerfile.app').replace(/'"'"'/g, "'")),
      // The api vhost's JSON-only CSP carries no wss:// origin; skip it.
      ...extractPolicies(read('nginx/nginx.prod.conf')).filter(policy => policy.includes('wss://')),
    ];
    expect(spaPolicies.length).toBeGreaterThan(0);
    spaPolicies.forEach(policy => expect(findMissingOrigins(policy)).toEqual([]));
  });

  it('requires fonts and telemetry origins', () => {
    expect(REQUIRED_ORIGINS.map(([directive]) => directive)).toEqual(
      expect.arrayContaining(['style-src', 'font-src', 'connect-src'])
    );
  });
});
