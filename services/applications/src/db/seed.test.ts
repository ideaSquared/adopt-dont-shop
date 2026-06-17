import { describe, expect, it } from 'vitest';

import { seedApplications, type QueryFn } from './seed.js';
import { SEED_APPLICATIONS } from './seed-data.js';

function recordingQuery(): { query: QueryFn; calls: Array<{ text: string; values: unknown[] }> } {
  const calls: Array<{ text: string; values: unknown[] }> = [];
  const query: QueryFn = async (text, values) => {
    calls.push({ text, values: [...values] });
    return undefined;
  };
  return { query, calls };
}

describe('applications seed', () => {
  it('seeds every application exactly once', async () => {
    const { query, calls } = recordingQuery();

    const seeded = await seedApplications({ query });

    expect(calls).toHaveLength(SEED_APPLICATIONS.length);
    expect(seeded).toEqual(SEED_APPLICATIONS.map(a => a.applicationId));
  });

  it('seeds an application owned by the e2e adopter and scoped to a rescue', async () => {
    const { query, calls } = recordingQuery();

    await seedApplications({ query });

    for (const call of calls) {
      // params: [application_id, user_id, pet_id, rescue_id, status]
      expect(call.values[1]).toBe('98915d9e-69ed-46b2-a897-57d8469ff360'); // John Smith
      expect(call.values[3]).toBeTruthy(); // rescue_id set → rescue inbox resolves it
    }
  });

  it('seeds a non-terminal status so the row is reviewable / not closed out', async () => {
    const { query, calls } = recordingQuery();

    await seedApplications({ query });

    for (const call of calls) {
      expect(['submitted', 'under_review']).toContain(call.values[4]);
    }
  });

  it('is idempotent — every insert uses ON CONFLICT (application_id) DO UPDATE', async () => {
    const { query, calls } = recordingQuery();

    await seedApplications({ query });

    for (const call of calls) {
      expect(call.text).toMatch(/ON CONFLICT \(application_id\) DO UPDATE/);
    }

    const second = recordingQuery();
    await seedApplications({ query: second.query });
    expect(second.calls).toHaveLength(calls.length);
  });
});
