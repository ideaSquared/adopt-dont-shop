import type { MigrationBuilder } from 'node-pg-migrate';

// Searchable snapshot columns for the staff applications list.
//
// The list filters on pet type / breed and searches by applicant name or
// email, but those live in other services' schemas (pets, auth) and there
// are no cross-schema joins. Snapshot them onto the read model instead:
//
//   - applicant_name / applicant_email come from the applicant's own
//     answers (personalInfo); the projector rewrites them on every write,
//     and this migration backfills them from the stored answers.
//   - pet_type / pet_breed are stamped when the draft starts (StartDraft
//     already fetches the pet). Existing rows are filled by the
//     application-pet-snapshot job, since the pets data is in another
//     schema.
//
// All nullable: expand-only, so the running code is unaffected.

export const up = async (pgm: MigrationBuilder): Promise<void> => {
  pgm.addColumns('applications', {
    pet_type: { type: 'text' },
    pet_breed: { type: 'text' },
    applicant_name: { type: 'text' },
    applicant_email: { type: 'text' },
  });

  pgm.createIndex('applications', ['rescue_id', 'pet_type'], {
    name: 'applications_rescue_id_pet_type_idx',
  });

  pgm.sql(`
    UPDATE applications
       SET applicant_name = NULLIF(
             btrim(
               coalesce(documents #>> '{answers,personalInfo,firstName}', '') || ' ' ||
               coalesce(documents #>> '{answers,personalInfo,lastName}', '')
             ),
             ''
           ),
           applicant_email = NULLIF(btrim(documents #>> '{answers,personalInfo,email}'), '')
     WHERE applicant_name IS NULL AND applicant_email IS NULL
  `);
};

export const down = async (pgm: MigrationBuilder): Promise<void> => {
  pgm.dropIndex('applications', ['rescue_id', 'pet_type'], {
    name: 'applications_rescue_id_pet_type_idx',
  });
  pgm.dropColumns('applications', ['pet_type', 'pet_breed', 'applicant_name', 'applicant_email']);
};
