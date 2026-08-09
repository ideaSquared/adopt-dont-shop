import type { MigrationBuilder } from 'node-pg-migrate';

// ADS-1155 — persist the pet's long-tail `extra_json` blob.
//
// CreatePetRequest / UpdatePetRequest carry an `extra_json` field
// (image_urls, good_with_*, vaccination_status, …) but the pets table had
// nowhere to store it, so it was silently dropped while the API returned
// 200. Add the jsonb column the handlers now read/write; the gateway's
// image round-trip (GET → merge image_urls → Update) depends on it.

export const up = async (pgm: MigrationBuilder): Promise<void> => {
  pgm.addColumn('pets', {
    extra_json: { type: 'jsonb', notNull: true, default: '{}' },
  });
};

export const down = async (pgm: MigrationBuilder): Promise<void> => {
  pgm.dropColumn('pets', 'extra_json');
};
