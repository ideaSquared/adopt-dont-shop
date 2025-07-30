// Re-export types from libraries - no local duplicates needed
export type {
  // API types
  ApiResponse,
  PaginatedResponse,
  BaseResponse,
  ErrorResponse,
} from '@adopt-dont-shop/lib-api';

export type {
  // Auth types
  User,
  LoginRequest,
  RegisterRequest,
  AuthResponse,
  ChangePasswordRequest,
  RefreshTokenRequest,
  RefreshTokenResponse,
} from '@adopt-dont-shop/lib-auth';

export type {
  // Application types
  Application,
  ApplicationData,
  ApplicationStatus,
  ApplicationWithPetInfo,
  Document,
  DocumentUpload,
} from '@adopt-dont-shop/lib-applications';

// App-specific types that don't exist in libraries yet
export interface DashboardStats {
  totalPets: number;
  availablePets: number;
  pendingApplications: number;
  totalApplications: number;
  successfulAdoptions: number;
  staffMembers: number;
}
