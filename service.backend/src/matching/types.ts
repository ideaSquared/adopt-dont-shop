import { AdopterLifestyle, InferredPrefs } from '../models/AdopterMatchProfile';
import { AgeGroup, EnergyLevel, Gender, PetType, Size } from '../models/Pet';

/**
 * Public types for the matching module.
 *
 * `AdopterContext` and `PetContext` are pre-fetched data the scorer
 * needs. Match service is responsible for hydrating them once per
 * batch so individual scorers stay pure.
 */

export type ScorerName = 'rule' | 'cf' | 'embedding' | 'llm';

export type ReasonChipKind = 'pref_match' | 'lifestyle' | 'distance' | 'similar_to_liked' | 'fresh';

export type ReasonChip = {
  kind: ReasonChipKind;
  label: string;
};

export type ScoreResult = {
  score: number; // 0..100
  reasons: ReasonChip[];
};

export type AdopterContext = {
  userId: string;
  preferredTypes: string[] | null;
  preferredSizes: string[] | null;
  preferredAgeGroups: string[] | null;
  preferredEnergy: string[] | null;
  preferredTemperament: string[] | null;
  lifestyle: AdopterLifestyle;
  maxDistanceKm: number | null;
  openToSpecialNeeds: boolean;
  inferredPrefs: InferredPrefs;
  // Optional adopter location for distance scoring. PostGIS point —
  // [lng, lat] when present.
  location: { lng: number; lat: number } | null;
};

export type PetContext = {
  petId: string;
  type: PetType;
  breedId: string | null;
  size: Size;
  ageGroup: AgeGroup;
  gender: Gender;
  energyLevel: EnergyLevel;
  temperament: string[];
  specialNeeds: boolean;
  goodWithChildren: boolean | null;
  goodWithDogs: boolean | null;
  goodWithCats: boolean | null;
  goodWithSmallAnimals: boolean | null;
  createdAt: Date;
  location: { lng: number; lat: number } | null;
};

export type ScoredPet = {
  petId: string;
  score: number;
  reasons: ReasonChip[];
};

export interface MatchScorer {
  readonly name: ScorerName;
  score(adopter: AdopterContext, pet: PetContext): Promise<ScoreResult>;
  scoreBatch?(adopter: AdopterContext, pets: PetContext[]): Promise<ScoreResult[]>;
}
