import { describe, expect, it } from 'vitest';
import { checkHealth, createClient, toApiError } from './client.js';
import { ApiError, CliError, NetworkError } from './errors.js';
import { apiError, json, makeCtx, sampleSession, type Route } from './test-support.js';

const clientFor = async (routes: Route) => {
  const ctx = await makeCtx({ routes });
  return {
    ctx,
    client: createClient({ fetch: ctx.fetch, baseUrl: 'http://127.0.0.1:4100', env: 'dev' }),
  };
};

describe('client error mapping', () => {
  it('turns a contract error into an ApiError with code, message, hint and status', async () => {
    const { client } = await clientFor(() =>
      apiError(403, 'UNLOCK_REQUIRED', 'needs unlock', 'run unlock')
    );
    const error = await client.whoami().catch((e: unknown) => e);
    expect(error).toBeInstanceOf(ApiError);
    expect(error).toMatchObject({
      code: 'UNLOCK_REQUIRED',
      message: 'needs unlock',
      hint: 'run unlock',
      status: 403,
      exitCode: 1,
    });
  });

  it('maps network failures to "Can\'t reach <env>"', async () => {
    const { client } = await clientFor(() => undefined);
    const error = await client.whoami().catch((e: unknown) => e);
    expect(error).toBeInstanceOf(NetworkError);
    expect((error as NetworkError).message).toBe("Can't reach dev.");
    expect((error as NetworkError).hint).toContain('pnpm ops doctor');
  });

  it('copes with error bodies that are not in the contract', () => {
    const error = toApiError(502, '<html>bad gateway</html>');
    expect(error).toMatchObject({ code: 'INTERNAL', status: 502 });
  });

  it('refuses responses that do not match the schema', async () => {
    const { client } = await clientFor(() => json({ nope: true }));
    const error = await client.whoami().catch((e: unknown) => e);
    expect(error).toBeInstanceOf(CliError);
    expect((error as CliError).message).toContain('does not understand');
  });

  it('sends the bearer token and JSON bodies', async () => {
    const seen: { auth: string | null; body: unknown }[] = [];
    const { client } = await clientFor(({ headers, body }) => {
      seen.push({ auth: headers.get('authorization'), body });
      return json({ unlocks: [] });
    });
    await client.withToken('tok').listUnlocks();
    expect(seen[0]?.auth).toBe('Bearer tok');
  });

  it('accepts 204 for logout', async () => {
    const { client } = await clientFor(() => ({ status: 204 }));
    await expect(client.withToken('t').logout()).resolves.toBeUndefined();
  });

  it('parses a login response', async () => {
    const { client } = await clientFor(() => json({ session: sampleSession() }));
    expect((await client.loginLocal('alice')).session.operator.login).toBe('alice');
  });
});

describe('health check', () => {
  it('reports readiness and the server clock', async () => {
    const ctx = await makeCtx({
      routes: () => ({ json: {}, headers: { date: 'Mon, 12 Oct 2026 14:00:00 GMT' } }),
    });
    expect(await checkHealth(ctx.fetch, 'http://x')).toEqual({
      ok: true,
      serverDate: 'Mon, 12 Oct 2026 14:00:00 GMT',
    });
  });

  it('is not ok when the server is down or unhappy', async () => {
    const down = await makeCtx({ routes: () => undefined });
    expect(await checkHealth(down.fetch, 'http://x')).toEqual({ ok: false });
    const sick = await makeCtx({ routes: () => ({ status: 503, json: {} }) });
    expect((await checkHealth(sick.fetch, 'http://x')).ok).toBe(false);
  });
});
