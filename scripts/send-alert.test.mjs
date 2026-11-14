import { execFile } from 'child_process';
import { createHmac } from 'crypto';
import { createServer } from 'http';
import { join } from 'path';
import { promisify } from 'util';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

const run = promisify(execFile);
const SCRIPT = join(import.meta.dirname, 'send-alert.sh');
const SECRET = 'shared-test-secret';

let server;
let received;
let answerWith;

beforeEach(async () => {
  received = [];
  answerWith = 200;
  server = createServer((req, res) => {
    const chunks = [];
    req.on('data', chunk => chunks.push(chunk));
    req.on('end', () => {
      received.push({ headers: req.headers, body: Buffer.concat(chunks).toString('utf8') });
      res.statusCode = answerWith;
      res.end('{}');
    });
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
});

afterEach(() => new Promise(resolve => server.close(resolve)));

const alertUrl = () => `http://127.0.0.1:${server.address().port}/alert`;

const send = (env, args = ['critical', 'Deploy to staging failed', 'run 123', 'ads-deploy']) =>
  run('bash', [SCRIPT, ...args], {
    env: {
      ...process.env,
      no_proxy: '127.0.0.1',
      NO_PROXY: '127.0.0.1',
      ALERT_URL: undefined,
      ALERT_SECRET: undefined,
      ...env,
    },
  });

describe('send-alert.sh', () => {
  it('posts the ads alert signed with the HMAC-SHA256 of the raw body', async () => {
    await send({ ALERT_URL: alertUrl(), ALERT_SECRET: SECRET });

    expect(received).toHaveLength(1);
    const [{ headers, body }] = received;
    expect(JSON.parse(body)).toEqual({
      project: 'ads',
      severity: 'critical',
      title: 'Deploy to staging failed',
      details: 'run 123',
      source: 'ads-deploy',
    });
    const expected = createHmac('sha256', SECRET).update(body).digest('hex');
    expect(headers['x-alert-signature-256']).toBe(`sha256=${expected}`);
  });

  it('skips quietly, sending nothing, when ALERT_URL or ALERT_SECRET is not set', async () => {
    await send({ ALERT_URL: alertUrl() });
    await send({ ALERT_SECRET: SECRET });

    expect(received).toHaveLength(0);
  });

  it('does not fail and reports only the HTTP status when the bot rejects the alert', async () => {
    answerWith = 401;

    const { stdout } = await send({ ALERT_URL: alertUrl(), ALERT_SECRET: SECRET });

    expect(stdout).toContain('HTTP 401');
    expect(stdout).not.toContain(SECRET);
    expect(stdout).not.toContain(alertUrl());
  });

  it('does not fail and prints no URL when the bot is unreachable', async () => {
    const url = alertUrl();
    await new Promise(resolve => server.close(resolve));

    const { stdout, stderr } = await send({ ALERT_URL: url, ALERT_SECRET: SECRET });

    expect(stdout).toContain('Alert not sent');
    expect(`${stdout}${stderr}`).not.toContain(url);
    server = createServer();
    await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  });
});
