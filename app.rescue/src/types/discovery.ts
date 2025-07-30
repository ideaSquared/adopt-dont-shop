// Discovery-specific type definitions

export interface DiscoveryPet {
  id: string;
  name: string;
  species: string;
  breed: string;
  age: number;
  gender: 'male' | 'female' | 'unknown';
  size: 'small' | 'medium' | 'large' | 'extra_large';
  photos: string[];
  description: string;
  location: {
    city: string;
    state: string;
    distance?: number;
  };
  traits: string[];
  good_with_kids?: boolean;
  good_with_dogs?: boolean;
  good_with_cats?: boolean;
  energy_level: 'low' | 'medium' | 'high';
  care_requirements: string[];
  adoption_fee: number;
  rescue_id: string;
  rescue_name: string;
  created_at: string;
  updated_at: string;
}

export interface PetDiscoveryQueue {
  pets: DiscoveryPet[];
  sessionId: string;
  hasMore: boolean;
  nextCursor?: string;
  recommendationScore?: number;
}

export interface PetSearchFilters {
  species?: string[];
  breed?: string[];
  age_min?: number;
  age_max?: number;
  gender?: string[];
  size?: string[];
  location?: {
    city?: string;
    state?: string;
    radius?: number;
  };
  traits?: string[];
  good_with_kids?: boolean;
  good_with_dogs?: boolean;
  good_with_cats?: boolean;
  energy_level?: string[];
  adoption_fee_max?: number;
  rescue_id?: string;
  search?: string;
  status?: string;
}

export type SwipeAction = 'like' | 'pass' | 'super_like';

export interface SwipeStats {
  sessionId: string;
  totalSwipes: number;
  likes: number;
  passes: number;
  superLikes: number;
  matchRate: number;
  averageSessionTime: number;
  lastActivity: string;
}
