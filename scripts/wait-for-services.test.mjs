import { execFileSync } from 'child_process';
import { chmodSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

const SCRIPT = join(import.meta.dirname, 'wait-for-services.sh');

// A fake `docker` on PATH standing in for `docker compose exec -T <svc> curl
// ... <url>`. It records every URL it was asked to curl (so we can assert
// the /health/ready endpoint, ADS-1308) and fails the first `failCount`
// calls before succeeding, so the retry loop is exercised for real.
function fakeDocker({ failCount = 0 }) {
  return `#!/usr/bin/env bash
set -euo pipefail
# args: compose -f <file> exec -T <svc> curl -fsS <url>
url="\${*: -1}"
echo "\$url" >> "$PWD/urls.log"
count_file="$PWD/call-count"
n=0
[ -f "\$count_file" ] && n="\$(cat "\$count_file")"
n=\$((n + 1))
echo "\$n" > "\$count_file"
if [ "\$n" -le ${failCount} ]; then
  exit 1
fi
exit 0
`;
}

let dir;

beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), 'wait-for-services-'));
});

afterEach(() => {
  rmSync(dir, { recursive: true, force: true });
});

function run(args, { failCount = 0 } = {}) {
  const dockerPath = join(dir, 'docker');
  writeFileSync(dockerPath, fakeDocker({ failCount }));
  chmodSync(dockerPath, 0o755);
  return execFileSync('bash', [SCRIPT, ...args], {
    cwd: dir,
    encoding: 'utf8',
    env: { ...process.env, PATH: `${dir}:${process.env.PATH}` },
  });
}

describe('wait-for-services.sh', () => {
  it('probes /health/ready, not /health/simple', () => {
    run(['docker-compose.prod.yml', '3', '0', 'service-gateway:4000']);
    const urls = readFileSync(join(dir, 'urls.log'), 'utf8');
    expect(urls).toContain('http://localhost:4000/health/ready');
    expect(urls).not.toContain('/health/simple');
  });

  it('succeeds once every target reports ready within the retry budget', () => {
    const out = run(
      ['docker-compose.prod.yml', '3', '0', 'service-gateway:4000', 'service-auth:5002'],
      { failCount: 1 }
    );
    expect(out).toContain('service-gateway healthy.');
    expect(out).toContain('service-auth healthy.');
  });

  it('exits non-zero and names the failing service when retries are exhausted', () => {
    expect.assertions(2);
    try {
      run(['docker-compose.prod.yml', '2', '0', 'service-pets:5003'], { failCount: 999 });
    } catch (error) {
      expect(error.status).not.toBe(0);
      expect(error.stdout.toString()).toContain('service-pets failed health check');
    }
  });

  it('rejects fewer than the required 4 arguments', () => {
    expect(() => run(['docker-compose.prod.yml', '2', '0'])).toThrow();
  });
});
