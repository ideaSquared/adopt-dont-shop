import type { MigrationBuilder } from 'node-pg-migrate';

// ADS-1465: two-stage applications. A question is either answered at the
// short "enquiry" stage or held back for the "full" stage once a staffer
// shortlists the adopter. Defaulting every row to 'full' keeps today's
// single-stage behaviour: a rescue that never sets 'enquiry' on anything
// still shows the whole form up front.

export const up = async (pgm: MigrationBuilder): Promise<void> => {
  pgm.createType('application_question_stage', ['enquiry', 'full']);
  pgm.addColumns('application_questions', {
    stage: { type: 'application_question_stage', notNull: true, default: 'full' },
  });
  pgm.createIndex('application_questions', 'stage', {
    name: 'application_questions_stage_idx',
  });
};

export const down = async (pgm: MigrationBuilder): Promise<void> => {
  pgm.dropIndex('application_questions', 'stage', {
    name: 'application_questions_stage_idx',
  });
  pgm.dropColumns('application_questions', ['stage']);
  pgm.dropType('application_question_stage');
};
