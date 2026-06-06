// Stage B — rescue response adapter.
//
// service.rescue returns proto-JSON (camelCase + SCREAMING enums); the
// frontend lib.rescue's RescueAPIResponseSchema is lenient (accepts BOTH
// snake_case and camelCase) but UI components consistently use the
// snake_case names. Emitting snake_case + lowercase enum tokens, plus
// settings_json blob → settings object, matches what transformRescueFromAPI
// expects. Wrapped in the { success, data, meta } envelope lib.rescue uses
// for list reads, and { success, data } for single reads.

import { RescueV1, type ListRescuesResponse, type Rescue } from '@adopt-dont-shop/proto';

function token(toJSON: (v: number) => string, value: number, prefix: string): string | undefined {
  if (value <= 0) {
    return undefined;
  }
  return toJSON(value).slice(prefix.length).toLowerCase();
}

function parseSettings(json: string | undefined): Record<string, unknown> {
  if (!json || json === '{}') {
    return {};
  }
  try {
    const parsed: unknown = JSON.parse(json);
    return typeof parsed === 'object' && parsed !== null && !Array.isArray(parsed)
      ? (parsed as Record<string, unknown>)
      : {};
  } catch {
    return {};
  }
}

export type RescueView = {
  rescue_id: string;
  name: string;
  email: string;
  phone: string | null;
  address: string;
  city: string;
  county: string | null;
  postcode: string;
  country: string;
  website: string | null;
  description: string | null;
  mission: string | null;
  companies_house_number: string | null;
  charity_registration_number: string | null;
  contact_person: string;
  contact_title: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  status: string;
  verified_at: string | null;
  verified_by: string | null;
  verification_source: string | null;
  verification_failure_reason: string | null;
  settings: Record<string, unknown>;
  created_at: string;
  updated_at: string;
};

export function rescueToView(r: Rescue): RescueView {
  return {
    rescue_id: r.rescueId,
    name: r.name,
    email: r.email,
    phone: r.phone ?? null,
    address: r.address,
    city: r.city,
    county: r.county ?? null,
    postcode: r.postcode,
    country: r.country,
    website: r.website ?? null,
    description: r.description ?? null,
    mission: r.mission ?? null,
    companies_house_number: r.companiesHouseNumber ?? null,
    charity_registration_number: r.charityRegistrationNumber ?? null,
    contact_person: r.contactPerson,
    contact_title: r.contactTitle ?? null,
    contact_email: r.contactEmail ?? null,
    contact_phone: r.contactPhone ?? null,
    status: token(RescueV1.rescueStatusToJSON, r.status, 'RESCUE_STATUS_') ?? 'pending',
    verified_at: r.verifiedAt ?? null,
    verified_by: r.verifiedBy ?? null,
    verification_source: r.verificationSource
      ? (token(
          RescueV1.rescueVerificationSourceToJSON,
          r.verificationSource,
          'RESCUE_VERIFICATION_SOURCE_'
        ) ?? null)
      : null,
    verification_failure_reason: r.verificationFailureReason ?? null,
    settings: parseSettings(r.settingsJson),
    created_at: r.createdAt,
    updated_at: r.updatedAt,
  };
}

// { success, data, meta } — the lib.rescue list envelope.
export type RescueListMeta = {
  hasNext: boolean;
  nextCursor?: string;
};

export function rescueListEnvelope(res: ListRescuesResponse): {
  success: true;
  data: RescueView[];
  meta: RescueListMeta;
} {
  const data = res.rescues.map(rescueToView);
  const hasNext = res.nextCursor !== undefined && res.nextCursor !== '';
  return {
    success: true,
    data,
    meta: { hasNext, ...(hasNext ? { nextCursor: res.nextCursor } : {}) },
  };
}

export function rescueDataEnvelope(rescue: Rescue): { success: true; data: RescueView } {
  return { success: true, data: rescueToView(rescue) };
}
