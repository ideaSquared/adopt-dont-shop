import { spawnSync } from 'child_process';
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'fs';
import { tmpdir } from 'os';
import { delimiter, join } from 'path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

const SCRIPT = join(import.meta.dirname, 'deploy-reload-prometheus.sh');
const OBSERVABILITY = ' -f docker-compose.observability.yml';

let dir;

// A fake `docker` on PATH: logs each call, and answers the rules query with
// FAKE_RULES_JSON (Prometheus's /api/v1/rules response).
beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), 'reload-prometheus-'));
  writeFileSync(
    join(dir, 'docker'),
    [
      '#!/usr/bin/env bash',
      'echo "$*" >> "$FAKE_DIR/calls"',
      'case "$*" in *api/v1/rules*) printf "%s" "$FAKE_RULES_JSON" ;; esac',
    ].join('\n'),
    { mode: 0o755 }
  );
});

afterEach(() => {
  rmSync(dir, { recursive: true, force: true });
});

const run = (overlayArgs, rulesJson = '{"data":{"groups":[{"name":"watchdog"}]}}') => {
  const result = spawnSync('bash', [SCRIPT, 'docker-compose.prod.yml', overlayArgs], {
    encoding: 'utf8',
    env: {
      ...process.env,
      PATH: `${dir}${delimiter}${process.env.PATH}`,
      FAKE_DIR: dir,
      FAKE_RULES_JSON: rulesJson,
      RELOAD_SETTLE_SECONDS: '0',
    },
  });
  const calls = existsSync(join(dir, 'calls'))
    ? readFileSync(join(dir, 'calls'), 'utf8').trim().split('\n')
    : [];
  return { ...result, calls };
};

describe('deploy-reload-prometheus.sh', () => {
  it('does nothing when the observability overlay is off', () => {
    const res = run('');

    expect(res.status).toBe(0);
    expect(res.calls).toEqual([]);
  });

  it('sends Prometheus SIGHUP so a running container picks up new rules and config', () => {
    const res = run(OBSERVABILITY);

    expect(res.status).toBe(0);
    expect(res.calls[0]).toBe(
      'compose -f docker-compose.prod.yml -f docker-compose.observability.yml --env-file .env kill -s SIGHUP prometheus'
    );
  });

  it('warns, without failing the deploy, when no rule groups are loaded', () => {
    const res = run(OBSERVABILITY, '{"data":{"groups":[]}}');

    expect(res.status).toBe(0);
    expect(res.stdout).toContain('::warning::');
  });

  it('does not warn when rule groups are loaded', () => {
    const res = run(OBSERVABILITY);

    expect(res.stdout).not.toContain('::warning::');
  });
});
