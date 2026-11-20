// service-gateway has its own environment block (it does not inherit
// x-service-env), so every OTEL_* setting the shared block sets must be
// forwarded to it explicitly. Otherwise the gateway, the HTTP entry point,
// falls back to the SDK default of sampling every trace.
import { readFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import { describe, expect, it } from 'vitest';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');

const otelKeys = text =>
  new Set([...text.matchAll(/^\s+(OTEL_[A-Z_]+):/gm)].map(match => match[1]));

const serviceBlock = (composeText, service) => {
  const start = composeText.indexOf(`\n  ${service}:\n`);
  const rest = composeText.slice(start + 1);
  const next = rest.slice(1).search(/\n {2}[a-z][a-z0-9-]*:\n/);
  return next === -1 ? rest : rest.slice(0, next + 1);
};

const sharedServiceEnv = composeText => {
  const start = composeText.indexOf('x-service-env:');
  const rest = composeText.slice(start);
  const end = rest.search(/\n\S/);
  return end === -1 ? rest : rest.slice(0, end);
};

describe.each(['docker-compose.prod.yml', 'docker-compose.staging.yml'])('%s', file => {
  it('forwards every shared OTEL_* setting to service-gateway', () => {
    const text = readFileSync(join(ROOT, file), 'utf8');
    const shared = otelKeys(sharedServiceEnv(text));
    const gateway = otelKeys(serviceBlock(text, 'service-gateway'));

    expect(shared.size).toBeGreaterThan(0);
    expect([...shared].filter(key => !gateway.has(key))).toEqual([]);
  });
});
