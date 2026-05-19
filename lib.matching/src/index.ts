/**
 * @adopt-dont-shop/lib.matching
 *
 * Shared types for the AI/ML pet-adopter matching feature. Mirrors
 * the backend `service.backend/src/matching/types.ts` surface for
 * data crossing the API boundary (top-picks response, discovery
 * pet card, match profile read/write).
 */

export type ReasonChipKind = 'pref_match' | 'lifestyle' | 'distance' | 'similar_to_liked' | 'fresh';

export type ReasonChip = {
  kind: ReasonChipKind;
  label: string;
};

export type AdopterLifestyle = {
  hours_alone_daily?: number;
  has_children?: boolean;
  has_other_pets?: boolean;
  yard?: boolean;
  housing_type?: 'apartment' | 'house' | 'condo' | 'other';
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
};
