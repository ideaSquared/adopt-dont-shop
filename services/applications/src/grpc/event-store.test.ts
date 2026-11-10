import type { PoolClient } from 'pg';
import { describe, expect, it, vi } from 'vitest';

import { INITIAL_STATE, type ApplicationState } from '../domain/index.js';

import { projectReadModel } from './event-store.js';

const makeClient = () => {
  const query = vi.fn().mockResolvedValue({ rows: [] });
  // A PoolClient stand-in: projectReadModel only calls query().
  return { client: { query } as unknown as PoolClient, query };
};

const state = (answers: Record<string, unknown>): ApplicationState => ({
  ...INITIAL_STATE,
  applicationId: 'app-1',
  adopterId: 'usr-1',
  petId: 'pet-1',
  rescueId: 'rsc-1',
  status: 'submitted',
  answers,
  version: 2,
});

const writtenColumns = (query: ReturnType<typeof vi.fn>): Record<string, unknown> => {
  const [sql, params] = query.mock.calls[0] as [string, unknown[]];
  const columns = /INSERT INTO applications \(([^)]*)\)/
    .exec(sql)![1]
    .split(',')
    .map(c => c.trim());
  return Object.fromEntries(columns.map((c, i) => [c, params[i]]));
};

describe('projectReadModel search columns', () => {
  it("stores the applicant's own name and email from their answers", async () => {
    const { client, query } = makeClient();

    await projectReadModel(
      client,
      state({ personalInfo: { firstName: 'Jane', lastName: 'Doe', email: 'jane@example.com' } })
    );

    expect(writtenColumns(query)).toMatchObject({
      applicant_name: 'Jane Doe',
      applicant_email: 'jane@example.com',
    });
    expect(query.mock.calls[0][0]).toMatch(/applicant_name = EXCLUDED\.applicant_name/);
  });

  it('stores nulls when the answers have no personal details yet', async () => {
    const { client, query } = makeClient();

    await projectReadModel(client, state({ personalInfo: { firstName: '  ' } }));

    expect(writtenColumns(query)).toMatchObject({ applicant_name: null, applicant_email: null });
  });
});
