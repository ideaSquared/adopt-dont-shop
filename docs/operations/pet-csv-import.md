# Pet CSV Import

The rescue app supports bulk-loading existing pet records from a CSV file
via the **Import CSV** button on Pet Management (or directly from the
empty state when a rescue has no pets yet — see ADS-646).

This document describes the accepted column format, the import flow, and
the idempotency model.

## When to use it

- Onboarding a rescue that already tracks pets in a spreadsheet
- One-off migrations from another adoption platform (Petfinder export,
  ASM, AnimalShelterManager, etc.)
- Periodic syncs from a third-party system that can produce CSVs

For day-to-day single-pet entry, prefer the **Add New Pet** modal — it
has been streamlined (ADS-646) so only the pet's name is required to
publish.

## Where to find it

- **Header action**: Pet Management → "Import CSV" (top right)
- **Empty state**: when a rescue has no pets, the Pet Management empty
  state shows a secondary "Import from CSV" button plus a link to this
  guide

Both entry points open the same `PetCsvImportModal` (defined in
`app.rescue/src/components/pets/PetCsvImportModal.tsx`).

## File format

- CSV (RFC 4180-style — embedded commas / newlines / quoted fields are
  supported). Excel and Google Sheets exports work out of the box.
- UTF-8 encoded. A leading BOM is tolerated.
- First row is the header row.

## Columns

The importer auto-maps column headers using a built-in alias table (case
and underscores are ignored). Unrecognised headers can be mapped by hand
in the modal's mapping step.

### Required columns

| Column   | Aliases                       |
| -------- | ----------------------------- |
| `name`   | `pet_name`, `animal_name`     |
| `type`   | `species`, `animal_type`      |
| `breed`  | `primary_breed`               |
| `gender` | `sex`                         |
| `size`   | —                             |
| `color`  | `colour`                      |

Values are validated against the same enums the API enforces:

- `type`: `dog`, `cat`, `rabbit`, `bird`, `reptile`, `small_mammal`, `fish`, `other`
- `gender`: `male`, `female`, `unknown`
- `size`: `extra_small`, `small`, `medium`, `large`, `extra_large`

### Optional columns

`externalId`, `secondaryBreed`, `markings`, `ageYears`, `ageMonths`,
`ageGroup`, `weightKg`, `microchipId`, `shortDescription`,
`longDescription`, `adoptionFee`, `energyLevel`, `specialNeeds`,
`houseTrained`, `goodWithChildren`, `goodWithDogs`, `goodWithCats`,
`goodWithSmallAnimals`, `vaccinationStatus`, `vaccinationDate`,
`spayNeuterStatus`, `spayNeuterDate`, `intakeDate`.

The full alias list and per-column validation rules live in
`lib.pets/src/csv-import.ts` (see `IMPORTABLE_FIELDS`).

## Idempotency

The optional `externalId` column makes re-importing safe. The importer
keeps a per-rescue set of imported external IDs in `localStorage` and
skips any row whose `externalId` is already known.

- Re-uploading the same file: rows are reported as **skipped duplicates**
  rather than reinserted.
- Different browser / different staff member: the in-memory dedupe only
  protects within a single session. The backend's own idempotency key
  prevents double-writes for the same upload batch.

## The flow

1. **Upload** — pick a CSV. The parser surfaces row + column counts.
2. **Map columns** — auto-mapped columns are pre-filled. Required fields
   that the parser couldn't auto-map must be assigned before continuing.
3. **Preview** — each row is validated client-side against the same Zod
   schema the backend uses. Invalid rows are shown with per-field error
   messages and skipped on import; valid rows are queued.
4. **Import** — valid rows POST to `/api/v1/pets` one at a time. The
   summary screen reports successes, skipped duplicates, and per-row
   failures.

## Limits

- No hard cap on row count, but uploads above a few thousand pets should
  be split across multiple files to keep the browser responsive.
- The 10-photo per-pet ceiling still applies. CSV imports do not carry
  image URLs — photos must be added per pet after import.

## Troubleshooting

- **"Required field missing" on every row**: the column header doesn't
  match any known alias. Map it manually in step 2.
- **All rows marked invalid**: the enum value for `type`, `gender`, or
  `size` doesn't match the accepted list above. Most third-party exports
  use slightly different casing — the importer is case-insensitive but
  doesn't translate (e.g. `M`/`F` aren't auto-mapped to
  `male`/`female`).
- **403 Forbidden during import**: your account isn't associated with a
  rescue. Set up the rescue first (Pet Management surfaces a setup card
  in that case).

## See also

- `lib.pets/src/csv-import.ts` — column catalogue, parser, validator
- `app.rescue/src/components/pets/PetCsvImportModal.tsx` — the import UI
- ADS-133 — original CSV import feature
- ADS-646 — empty-state link and reduced single-pet entry friction
