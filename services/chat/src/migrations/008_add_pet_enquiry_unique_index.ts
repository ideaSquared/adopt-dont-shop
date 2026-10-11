import type { MigrationBuilder } from 'node-pg-migrate';

// Pet enquiries — chats an adopter opens about a pet before applying.
//
// An enquiry is a chat with a pet_id and no application_id, created_by the
// adopter. The columns already exist (001); this enforces one live enquiry
// per adopter and pet, so a double-clicked "Ask a question" or two racing
// OpenPetEnquiry calls can't create duplicates.

export const up = async (pgm: MigrationBuilder): Promise<void> => {
  pgm.createIndex('chats', ['pet_id', 'created_by'], {
    unique: true,
    name: 'chats_pet_enquiry_unique',
    where: 'application_id IS NULL AND pet_id IS NOT NULL AND deleted_at IS NULL',
  });
};

export const down = async (pgm: MigrationBuilder): Promise<void> => {
  pgm.dropIndex('chats', ['pet_id', 'created_by'], { name: 'chats_pet_enquiry_unique' });
};
