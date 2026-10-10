import { describe, expect, it, vi } from 'vitest';

import { CORE_APPLICATION_QUESTIONS, down, up } from './013_seed_core_application_questions.js';

function makePgm() {
  const calls: string[] = [];
  const pgm = { sql: vi.fn((text: string) => calls.push(text)) };
  return { pgm, calls };
}

describe('013_seed_core_application_questions', () => {
  it('seeds the platform questionnaire every application form starts from', async () => {
    const { pgm, calls } = makePgm();

    await up(pgm as never);

    const sql = calls.join('\n');
    expect(sql).toContain('INSERT INTO rescue.application_questions');
    for (const q of CORE_APPLICATION_QUESTIONS) {
      expect(sql).toContain(`'${q.key}'`);
    }
    expect(CORE_APPLICATION_QUESTIONS.filter(q => q.isRequired).map(q => q.key)).toEqual(
      expect.arrayContaining(['employment_status', 'housing_type', 'why_adopt', 'agree_terms'])
    );
  });

  it('inserts them as core rows shared by every rescue', async () => {
    const { pgm, calls } = makePgm();

    await up(pgm as never);

    expect(calls.join('\n')).toMatch(/'core', NULL/);
  });

  it('is a no-op for questions that already exist, so re-running is safe', async () => {
    const { pgm, calls } = makePgm();

    await up(pgm as never);

    expect(calls.join('\n')).toContain(
      "ON CONFLICT (question_key) WHERE scope = 'core' AND deleted_at IS NULL DO NOTHING"
    );
  });

  it('escapes apostrophes in question text', async () => {
    const { pgm, calls } = makePgm();

    await up(pgm as never);

    const withApostrophe = CORE_APPLICATION_QUESTIONS.find(q => q.text.includes("'"));
    expect(withApostrophe).toBeDefined();
    expect(calls.join('\n')).toContain(withApostrophe!.text.replaceAll("'", "''"));
  });

  it('down removes only the core questions it seeded', async () => {
    const { pgm, calls } = makePgm();

    await down(pgm as never);

    expect(calls).toHaveLength(1);
    expect(calls[0]).toMatch(/^DELETE FROM rescue\.application_questions WHERE scope = 'core'/);
  });
});
