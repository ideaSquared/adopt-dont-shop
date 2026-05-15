// CSV import helpers for bulk pet onboarding (ADS-133).
//
// Three pure functions form the core of the import flow so they can be
// tested independently of the React UI in app.rescue:
//   parseCsv          → splits raw CSV text into headers + row records
//   autoMapColumns    → best-effort guess of csvHeader → Pet field
//   validateMappedRow → validates one mapped row against PetCreateData
//
// The UI is responsible for: file upload, letting the user adjust the
// mapping, previewing validation results, and POSTing valid rows.

import { z } from 'zod';
import {
  PetAgeGroupSchema,
  PetCreateDataSchema,
  PetEnergyLevelSchema,
  PetGenderSchema,
  PetSizeSchema,
  PetSpayNeuterStatusSchema,
  PetTypeSchema,
  PetVaccinationStatusSchema,
  type PetCreateData,
} from './schemas';

// ── Field catalogue ──────────────────────────────────────────────────────────

export type ImportableField =
  | 'externalId'
  | 'name'
  | 'type'
  | 'breed'
  | 'secondaryBreed'
  | 'gender'
  | 'size'
  | 'color'
  | 'markings'
  | 'ageYears'
  | 'ageMonths'
  | 'ageGroup'
  | 'weightKg'
  | 'microchipId'
  | 'shortDescription'
  | 'longDescription'
  | 'adoptionFee'
  | 'energyLevel'
  | 'specialNeeds'
  | 'houseTrained'
  | 'goodWithChildren'
  | 'goodWithDogs'
  | 'goodWithCats'
  | 'goodWithSmallAnimals'
  | 'vaccinationStatus'
  | 'vaccinationDate'
  | 'spayNeuterStatus'
  | 'spayNeuterDate'
  | 'intakeDate';

type FieldDef = {
  key: ImportableField;
  label: string;
  required: boolean;
  aliases: string[];
};

// Required matches `PetCreateData` minus `rescueId` (set server-side from auth).
// `externalId` is only used for idempotency — it is stripped before POST.
export const IMPORTABLE_FIELDS: readonly FieldDef[] = [
  {
    key: 'externalId',
    label: 'External ID',
    required: false,
    aliases: ['external_id', 'id', 'source_id', 'sourceid'],
  },
  { key: 'name', label: 'Name', required: true, aliases: ['pet_name', 'animal_name'] },
  { key: 'type', label: 'Type', required: true, aliases: ['species', 'animal_type'] },
  { key: 'breed', label: 'Breed', required: true, aliases: ['primary_breed'] },
  {
    key: 'secondaryBreed',
    label: 'Secondary Breed',
    required: false,
    aliases: ['secondary_breed', 'mix'],
  },
  { key: 'gender', label: 'Gender', required: true, aliases: ['sex'] },
  { key: 'size', label: 'Size', required: true, aliases: [] },
  { key: 'color', label: 'Color', required: true, aliases: ['colour'] },
  { key: 'markings', label: 'Markings', required: false, aliases: [] },
  { key: 'ageYears', label: 'Age (years)', required: false, aliases: ['age_years', 'years'] },
  { key: 'ageMonths', label: 'Age (months)', required: false, aliases: ['age_months', 'months'] },
  { key: 'ageGroup', label: 'Age Group', required: false, aliases: ['age_group'] },
  { key: 'weightKg', label: 'Weight (kg)', required: false, aliases: ['weight_kg', 'weight'] },
  {
    key: 'microchipId',
    label: 'Microchip ID',
    required: false,
    aliases: ['microchip', 'microchip_id', 'chip'],
  },
  {
    key: 'shortDescription',
    label: 'Short Description',
    required: false,
    aliases: ['short_description', 'summary'],
  },
  {
    key: 'longDescription',
    label: 'Long Description',
    required: false,
    aliases: ['long_description', 'description', 'bio'],
  },
  { key: 'adoptionFee', label: 'Adoption Fee', required: false, aliases: ['adoption_fee', 'fee'] },
  {
    key: 'energyLevel',
    label: 'Energy Level',
    required: false,
    aliases: ['energy_level', 'energy'],
  },
  { key: 'specialNeeds', label: 'Special Needs', required: false, aliases: ['special_needs'] },
  {
    key: 'houseTrained',
    label: 'House Trained',
    required: false,
    aliases: ['house_trained', 'housetrained'],
  },
  {
    key: 'goodWithChildren',
    label: 'Good With Children',
    required: false,
    aliases: ['good_with_children', 'good_with_kids'],
  },
  { key: 'goodWithDogs', label: 'Good With Dogs', required: false, aliases: ['good_with_dogs'] },
  { key: 'goodWithCats', label: 'Good With Cats', required: false, aliases: ['good_with_cats'] },
  {
    key: 'goodWithSmallAnimals',
    label: 'Good With Small Animals',
    required: false,
    aliases: ['good_with_small_animals'],
  },
  {
    key: 'vaccinationStatus',
    label: 'Vaccination Status',
    required: false,
    aliases: ['vaccination_status', 'vaccinated'],
  },
  {
    key: 'vaccinationDate',
    label: 'Vaccination Date',
    required: false,
    aliases: ['vaccination_date'],
  },
  {
    key: 'spayNeuterStatus',
    label: 'Spay/Neuter Status',
    required: false,
    aliases: ['spay_neuter_status', 'fixed'],
  },
  {
    key: 'spayNeuterDate',
    label: 'Spay/Neuter Date',
    required: false,
    aliases: ['spay_neuter_date'],
  },
  { key: 'intakeDate', label: 'Intake Date', required: false, aliases: ['intake_date', 'date_in'] },
];

export const REQUIRED_FIELDS: readonly ImportableField[] = IMPORTABLE_FIELDS.filter(
  (f) => f.required
).map((f) => f.key);

// ── CSV parser ───────────────────────────────────────────────────────────────

export type CsvRow = Record<string, string>;
export type ParsedCsv = { headers: string[]; rows: CsvRow[] };

// RFC 4180-ish: handles quoted fields, embedded commas/newlines, and ""
// to escape a quote. Sufficient for spreadsheets exported by Google
// Sheets / Excel / common adoption platforms.
export function parseCsv(text: string): ParsedCsv {
  const rows: string[][] = [];
  let field = '';
  let row: string[] = [];
  let inQuotes = false;
  let i = 0;
  const src = text.replace(/^﻿/, '');

  while (i < src.length) {
    const c = src[i];

    if (inQuotes) {
      if (c === '"' && src[i + 1] === '"') {
        field += '"';
        i += 2;
        continue;
      }
      if (c === '"') {
        inQuotes = false;
        i += 1;
        continue;
      }
      field += c;
      i += 1;
      continue;
    }

    if (c === '"') {
      inQuotes = true;
      i += 1;
      continue;
    }
    if (c === ',') {
      row.push(field);
      field = '';
      i += 1;
      continue;
    }
    if (c === '\r') {
      i += 1;
      continue;
    }
    if (c === '\n') {
      row.push(field);
      rows.push(row);
      row = [];
      field = '';
      i += 1;
      continue;
    }
    field += c;
    i += 1;
  }
  // Final field (no trailing newline)
  if (field.length > 0 || row.length > 0) {
    row.push(field);
    rows.push(row);
  }

  if (rows.length === 0) {
    return { headers: [], rows: [] };
  }

  const headers = rows[0].map((h) => h.trim());
  const dataRows: CsvRow[] = rows
    .slice(1)
    .filter((r) => r.some((cell) => cell.trim() !== ''))
    .map((r) => {
      const record: CsvRow = {};
      headers.forEach((h, idx) => {
        record[h] = (r[idx] ?? '').trim();
      });
      return record;
    });

  return { headers, rows: dataRows };
}

// ── Auto column mapping ──────────────────────────────────────────────────────

export type ColumnMapping = Partial<Record<ImportableField, string>>;

const normalise = (s: string): string => s.toLowerCase().replace(/[^a-z0-9]/g, '');

export function autoMapColumns(csvHeaders: string[]): ColumnMapping {
  const mapping: ColumnMapping = {};
  const used = new Set<string>();

  for (const field of IMPORTABLE_FIELDS) {
    const candidates = [field.key, field.label, ...field.aliases].map(normalise);
    const match = csvHeaders.find((h) => !used.has(h) && candidates.includes(normalise(h)));
    if (match) {
      mapping[field.key] = match;
      used.add(match);
    }
  }
  return mapping;
}

// ── Row validation ───────────────────────────────────────────────────────────

export type ValidRow = {
  ok: true;
  rowIndex: number;
  data: PetCreateData;
  externalId: string | null;
};
export type InvalidRow = {
  ok: false;
  rowIndex: number;
  errors: string[];
  externalId: string | null;
};
export type ValidatedRow = ValidRow | InvalidRow;

const parseBool = (raw: string): boolean | null => {
  const v = raw.trim().toLowerCase();
  if (['true', 'yes', 'y', '1'].includes(v)) {
    return true;
  }
  if (['false', 'no', 'n', '0'].includes(v)) {
    return false;
  }
  return null;
};

const parseDate = (raw: string): string | null => {
  const v = raw.trim();
  if (!v) {
    return null;
  }
  const t = Date.parse(v);
  if (Number.isNaN(t)) {
    return null;
  }
  return new Date(t).toISOString();
};

const parseInteger = (raw: string): number | null => {
  const v = raw.trim();
  if (!/^-?\d+$/.test(v)) {
    return null;
  }
  return Number.parseInt(v, 10);
};

type FieldHandler = (
  raw: string,
  errors: string[],
  data: Record<string, unknown>,
  field: ImportableField
) => void;

const enumHandler =
  (schema: z.ZodEnum<Record<string, string>>): FieldHandler =>
  (raw, errors, data, field) => {
    const parsed = schema.safeParse(raw.trim().toLowerCase());
    if (!parsed.success) {
      errors.push(
        `${field}: "${raw}" is not a valid value (expected one of ${schema.options.join(', ')})`
      );
      return;
    }
    data[field] = parsed.data;
  };

const stringHandler: FieldHandler = (raw, _errors, data, field) => {
  if (raw.trim()) {
    data[field] = raw.trim();
  }
};

const intHandler: FieldHandler = (raw, errors, data, field) => {
  if (!raw.trim()) {
    return;
  }
  const n = parseInteger(raw);
  if (n === null) {
    errors.push(`${field}: "${raw}" is not a valid integer`);
    return;
  }
  data[field] = n;
};

const boolHandler: FieldHandler = (raw, errors, data, field) => {
  if (!raw.trim()) {
    return;
  }
  const b = parseBool(raw);
  if (b === null) {
    errors.push(`${field}: "${raw}" is not a valid boolean (use true/false, yes/no, 1/0)`);
    return;
  }
  data[field] = b;
};

const dateHandler: FieldHandler = (raw, errors, data, field) => {
  if (!raw.trim()) {
    return;
  }
  const iso = parseDate(raw);
  if (iso === null) {
    errors.push(`${field}: "${raw}" is not a valid date`);
    return;
  }
  data[field] = iso;
};

const FIELD_HANDLERS: Record<ImportableField, FieldHandler> = {
  externalId: () => {},
  name: stringHandler,
  type: enumHandler(PetTypeSchema),
  breed: stringHandler,
  secondaryBreed: stringHandler,
  gender: enumHandler(PetGenderSchema),
  size: enumHandler(PetSizeSchema),
  color: stringHandler,
  markings: stringHandler,
  ageYears: intHandler,
  ageMonths: intHandler,
  ageGroup: enumHandler(PetAgeGroupSchema),
  weightKg: stringHandler,
  microchipId: stringHandler,
  shortDescription: stringHandler,
  longDescription: stringHandler,
  adoptionFee: stringHandler,
  energyLevel: enumHandler(PetEnergyLevelSchema),
  specialNeeds: boolHandler,
  houseTrained: boolHandler,
  goodWithChildren: boolHandler,
  goodWithDogs: boolHandler,
  goodWithCats: boolHandler,
  goodWithSmallAnimals: boolHandler,
  vaccinationStatus: enumHandler(PetVaccinationStatusSchema),
  vaccinationDate: dateHandler,
  spayNeuterStatus: enumHandler(PetSpayNeuterStatusSchema),
  spayNeuterDate: dateHandler,
  intakeDate: dateHandler,
};

export function validateMappedRow(
  row: CsvRow,
  mapping: ColumnMapping,
  rowIndex: number,
  rescueId: string
): ValidatedRow {
  const errors: string[] = [];
  const data: Record<string, unknown> = { rescueId };

  const externalIdHeader = mapping.externalId;
  const externalId = externalIdHeader ? (row[externalIdHeader] || '').trim() || null : null;

  // Required-field presence check first.
  for (const field of IMPORTABLE_FIELDS) {
    const header = mapping[field.key];
    if (field.required) {
      const value = header ? (row[header] || '').trim() : '';
      if (!value) {
        errors.push(`${field.key}: required field is missing`);
        continue;
      }
    }
    if (!header) {
      continue;
    }
    const raw = row[header] ?? '';
    if (!raw.trim() && !field.required) {
      continue;
    }
    FIELD_HANDLERS[field.key](raw, errors, data, field.key);
  }

  if (errors.length > 0) {
    return { ok: false, rowIndex, errors, externalId };
  }

  const parsed = PetCreateDataSchema.safeParse(data);
  if (!parsed.success) {
    return {
      ok: false,
      rowIndex,
      errors: parsed.error.issues.map((i) => `${i.path.join('.') || 'row'}: ${i.message}`),
      externalId,
    };
  }

  return { ok: true, rowIndex, data: parsed.data, externalId };
}
