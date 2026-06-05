// CAD lesson #7: ts-proto emits each message as **both** an `interface X`
// AND a `const X` (the message factory with encode/decode/fromJSON). That
// makes `PingV1.EchoRequest` ambiguous in type position — it resolves to
// the const factory, not the interface, and downstream consumers see the
// wrong shape.
//
// The fix, ported from `@cad/proto`, is to export each package twice:
//
//   - **Value namespace** (`PingV1`, `NotificationsV1`) — use for
//     instantiating messages, calling encode/decode/fromJSON, reading
//     enum values, AND for the gRPC service definitions + client
//     constructors that ts-proto emits with `outputServices=grpc-js`:
//
//       import { NotificationsV1 } from '@adopt-dont-shop/proto';
//       server.addService(
//         NotificationsV1.NotificationServiceService,
//         handlers,
//       );
//
//   - **Flat type-only re-exports** — for type positions:
//
//       import type { CreateNotificationRequest } from '@adopt-dont-shop/proto';
//       const req: CreateNotificationRequest = { ... };
//
// Every new .proto file added under `proto/` gets the same two-line
// treatment here. Namespace convention: `<Package><Version>` —
// `AuthV1`, `PetsV1`, ...

export * as PingV1 from './generated/proto/adopt_dont_shop/v1/ping.js';
export type { EchoRequest, EchoResponse } from './generated/proto/adopt_dont_shop/v1/ping.js';

export * as NotificationsV1 from './generated/proto/adopt_dont_shop/notifications/v1/notification.js';
export type {
  Notification,
  CreateNotificationRequest,
  CreateNotificationResponse,
  ListNotificationsRequest,
  ListNotificationsResponse,
  DismissNotificationRequest,
  DismissNotificationResponse,
  NotificationServiceServer,
  NotificationServiceClient,
} from './generated/proto/adopt_dont_shop/notifications/v1/notification.js';

export * as AuthV1 from './generated/proto/adopt_dont_shop/auth/v1/auth.js';
export type {
  Principal as AuthPrincipal,
  User as AuthUser,
  TokenPair,
  LoginRequest,
  LoginResponse,
  LogoutRequest,
  LogoutResponse,
  RefreshTokenRequest,
  RefreshTokenResponse,
  ValidateTokenRequest,
  ValidateTokenResponse,
  GetMeRequest,
  GetMeResponse,
  AssignRoleRequest,
  AssignRoleResponse,
  AuthServiceServer,
  AuthServiceClient,
} from './generated/proto/adopt_dont_shop/auth/v1/auth.js';

export * as PetsV1 from './generated/proto/adopt_dont_shop/pets/v1/pet.js';
export type {
  Pet,
  PetStatusTransition,
  CreatePetRequest,
  CreatePetResponse,
  GetPetRequest,
  GetPetResponse,
  ListPetsRequest,
  ListPetsResponse,
  UpdatePetRequest,
  UpdatePetResponse,
  UpdatePetStatusRequest,
  UpdatePetStatusResponse,
  DeletePetRequest,
  DeletePetResponse,
  PetServiceServer,
  PetServiceClient,
} from './generated/proto/adopt_dont_shop/pets/v1/pet.js';
