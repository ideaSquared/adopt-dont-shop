/**
 * @adopt-dont-shop/lib.matching
 *
 * Shared types for the AI/ML pet-adopter matching feature. Mirrors
 * the matching gRPC surface exposed by `services/matching` (MatchingV1
 * proto in `@adopt-dont-shop/proto`) for data crossing the API boundary
 * (top-picks response, discovery pet card, match profile read/write).
 */

export const REASON_CHIP_KINDS = [
  'pref_match',
  'lifestyle',
  'distance',
  'similar_to_liked',
  'fresh',
] as const;

export type ReasonChipKind = (typeof REASON_CHIP_KINDS)[number];

export const isReasonChipKind = (value: unknown): value is ReasonChipKind =>
  typeof value === 'string' && (REASON_CHIP_KINDS as readonly string[]).includes(value);

export type ReasonChip = {
  kind: ReasonChipKind;
  label: string;
};

export type AdopterLifestyle = {
  hours_alone_daily?: number;
  has_children?: boolean;
  /**
   * Granular selection the user actually made in the onboarding wizard.
   * Persists alongside the `has_children` boolean so round-tripping the
   * profile through the UI doesn't lose fidelity. (ADS-688)
   */
  children_type?: 'none' | 'young' | 'older';
  has_other_pets?: boolean;
  /** See `children_type`. (ADS-688) */
  other_pets_type?: 'none' | 'dogs' | 'cats' | 'mixed';
  yard?: boolean;
  housing_type?: 'apartment' | 'house' | 'condo' | 'other';
  /**
   * Self-reported activity level. Surfaced to the matching engine as a
   * secondary signal alongside `preferred_energy`. (ADS-688)
   */
  activity_level?: 'low' | 'medium' | 'high';
};

export type AdopterMatchProfile = {
  user_id: string;
  preferred_types: string[] | null;
  preferred_sizes: string[] | null;
  preferred_age_groups: string[] | null;
  preferred_energy: string[] | null;
  preferred_temperament: string[] | null;
  lifestyle: AdopterLifestyle;
  max_distance_km: number | null;
  open_to_special_needs: boolean;
  notify_new_matches: boolean;
  min_notification_score: number;
  allergies: string | null;
};

export type MatchTopPick = {
  petId: string;
  name: string;
  type: string;
  ageGroup: string;
  size: string;
  score: number;
  reasons: ReasonChip[];
  rescueName: string;
  breedName?: string | null;
  photoUrl?: string | null;
};

export { MatchingService } from './matching-service';
