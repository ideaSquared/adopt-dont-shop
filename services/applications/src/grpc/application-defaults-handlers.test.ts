import { describe, expect, it, vi } from 'vitest';

import { HandlerError, type HandlerDeps } from './adapter.js';
import {
  getApplicationDefaults,
  updateApplicationDefaults,
} from './application-defaults-handlers.js';

function makePrincipal(
  overrides: Partial<{ userId: string; roles: string[]; permissions: string[] }> = {}
) {
  return {
    userId: overrides.userId ?? 'usr-1',
    roles: overrides.roles ?? ['adopter'],
    permissions: overrides.permissions ?? ['applications.read', 'applications.update'],
  } as unknown as Parameters<typeof getApplicationDefaults>[1];
}

function makeDeps(): { deps: HandlerDeps; query: ReturnType<typeof vi.fn> } {
  const query = vi.fn();
  const pool = { query } as unknown as HandlerDeps['pool'];
  return { deps: { pool, nats: {} } as unknown as HandlerDeps, query };
}

describe('getApplicationDefaults', () => {
  it('throws PERMISSION_DENIED without applications.read', async () => {
    const { deps } = makeDeps();
    await expect(
      getApplicationDefaults(deps, makePrincipal({ permissions: [] }), {})
    ).rejects.toBeInstanceOf(HandlerError);
  });

  it('returns an empty defaults_json when the adopter has no saved row', async () => {
    const { deps, query } = makeDeps();
    query.mockResolvedValueOnce({ rows: [] });

    const res = await getApplicationDefaults(deps, makePrincipal(), {});

    expect(res.defaultsJson).toBe('');
  });

  it('returns the stored defaults as a JSON string', async () => {
    const { deps, query } = makeDeps();
    query.mockResolvedValueOnce({ rows: [{ data: { personalInfo: { firstName: 'Ada' } } }] });

    const res = await getApplicationDefaults(deps, makePrincipal(), {});

    expect(JSON.parse(res.defaultsJson)).toEqual({ personalInfo: { firstName: 'Ada' } });
  });

  it('scopes the read to the calling principal, not a request-supplied id', async () => {
    const { deps, query } = makeDeps();
    query.mockResolvedValueOnce({ rows: [] });

    await getApplicationDefaults(deps, makePrincipal({ userId: 'usr-9' }), {});

    expect(query.mock.calls[0][1]).toEqual(['usr-9']);
  });
});

describe('updateApplicationDefaults', () => {
  it('throws PERMISSION_DENIED without applications.update', async () => {
    const { deps } = makeDeps();
    await expect(
      updateApplicationDefaults(deps, makePrincipal({ permissions: ['applications.read'] }), {
        defaultsPatchJson: '{}',
      })
    ).rejects.toBeInstanceOf(HandlerError);
  });

  it('throws INVALID_ARGUMENT when the patch is not valid JSON', async () => {
    const { deps, query } = makeDeps();
    await expect(
      updateApplicationDefaults(deps, makePrincipal(), { defaultsPatchJson: 'not json' })
    ).rejects.toBeInstanceOf(HandlerError);
    expect(query).not.toHaveBeenCalled();
  });

  it('throws INVALID_ARGUMENT when the patch is not a JSON object', async () => {
    const { deps } = makeDeps();
    await expect(
      updateApplicationDefaults(deps, makePrincipal(), { defaultsPatchJson: '[1,2]' })
    ).rejects.toBeInstanceOf(HandlerError);
  });

  it('deep-merges the patch into the existing stored defaults and upserts the result', async () => {
    const { deps, query } = makeDeps();
    query
      .mockResolvedValueOnce({
        rows: [{ data: { personalInfo: { firstName: 'Ada', lastName: 'Lovelace' } } }],
      })
      .mockResolvedValueOnce({ rows: [] });

    const res = await updateApplicationDefaults(deps, makePrincipal(), {
      defaultsPatchJson: JSON.stringify({ personalInfo: { firstName: 'Grace' } }),
    });

    expect(JSON.parse(res.defaultsJson)).toEqual({
      personalInfo: { firstName: 'Grace', lastName: 'Lovelace' },
    });
    const [upsertSql, upsertParams] = query.mock.calls[1];
    expect(upsertSql).toContain('INSERT INTO application_defaults');
    expect(upsertParams[0]).toBe('usr-1');
    expect(JSON.parse(upsertParams[1])).toEqual({
      personalInfo: { firstName: 'Grace', lastName: 'Lovelace' },
    });
  });

  it('treats a missing saved row as an empty base', async () => {
    const { deps, query } = makeDeps();
    query.mockResolvedValueOnce({ rows: [] }).mockResolvedValueOnce({ rows: [] });

    const res = await updateApplicationDefaults(deps, makePrincipal(), {
      defaultsPatchJson: JSON.stringify({ personalInfo: { firstName: 'Grace' } }),
    });

    expect(JSON.parse(res.defaultsJson)).toEqual({ personalInfo: { firstName: 'Grace' } });
  });

  it('scopes the write to the calling principal', async () => {
    const { deps, query } = makeDeps();
    query.mockResolvedValueOnce({ rows: [] }).mockResolvedValueOnce({ rows: [] });

    await updateApplicationDefaults(deps, makePrincipal({ userId: 'usr-9' }), {
      defaultsPatchJson: '{}',
    });

    expect(query.mock.calls[0][1]).toEqual(['usr-9']);
    expect(query.mock.calls[1][1][0]).toBe('usr-9');
  });
});
