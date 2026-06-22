// Promise-wrapped client for service.auth.
//
// Phase 2.5 wired only ValidateToken (the per-request hot path).
// Phase 2.6 adds Login / Logout / RefreshToken / GetMe / AssignRole
// so the gateway can route /api/auth/* through here instead of the
// catch-all proxy.
//
// Same shape as services/gateway/src/grpc-clients/notifications-client.ts:
// the interface is exported so tests can substitute a mock; the
// middleware + routes depend on the shape, not the @grpc/grpc-js client.

import { credentials, Metadata, type CallOptions } from '@grpc/grpc-js';

import {
  AuthV1,
  type AssignRoleRequest,
  type AssignRoleResponse,
  type ChangePasswordRequest,
  type ChangePasswordResponse,
  type DisableTwoFactorRequest,
  type DisableTwoFactorResponse,
  type EnableTwoFactorRequest,
  type EnableTwoFactorResponse,
  type ForgotPasswordRequest,
  type ForgotPasswordResponse,
  type SetupTwoFactorRequest,
  type SetupTwoFactorResponse,
  type GetMeRequest,
  type GetMeResponse,
  type LoginRequest,
  type LoginResponse,
  type LogoutRequest,
  type LogoutResponse,
  type RefreshTokenRequest,
  type RefreshTokenResponse,
  type ProvisionInvitedUserRequest,
  type ProvisionInvitedUserResponse,
  type RedeemInvitationRequest,
  type RedeemInvitationResponse,
  type RegisterRequest,
  type RegisterResponse,
  type ResendVerificationRequest,
  type ResendVerificationResponse,
  type ResetPasswordRequest,
  type ResetPasswordResponse,
  type UpdateAccountRequest,
  type UpdateAccountResponse,
  type ValidateTokenRequest,
  type ValidateTokenResponse,
  type VerifyEmailRequest,
  type VerifyEmailResponse,
  type ListSessionsRequest,
  type ListSessionsResponse,
  type RevokeSessionRequest,
  type RevokeSessionResponse,
  type AdminListSessionsRequest,
  type AdminListSessionsResponse,
  type AdminRevokeSessionRequest,
  type AdminRevokeSessionResponse,
  type AdminRevokeAllUserSessionsRequest,
  type AdminRevokeAllUserSessionsResponse,
  type AdminLockAccountRequest,
  type AdminLockAccountResponse,
  type AdminUnlockAccountRequest,
  type AdminUnlockAccountResponse,
  type ListIpRulesRequest,
  type ListIpRulesResponse,
  type CreateIpRuleRequest,
  type CreateIpRuleResponse,
  type DeleteIpRuleRequest,
  type DeleteIpRuleResponse,
  type GetPrivacyPreferencesRequest,
  type GetPrivacyPreferencesResponse,
  type UpdatePrivacyPreferencesRequest,
  type UpdatePrivacyPreferencesResponse,
  type ResetPrivacyPreferencesRequest,
  type ResetPrivacyPreferencesResponse,
  type SearchUsersRequest,
  type SearchUsersResponse,
  type AdminCreateUserRequest,
  type AdminCreateUserResponse,
  type AdminGetUserRequest,
  type AdminGetUserResponse,
  type AdminUpdateUserRequest,
  type AdminUpdateUserResponse,
  type DeactivateUserRequest,
  type DeactivateUserResponse,
  type ReactivateUserRequest,
  type ReactivateUserResponse,
  type AdminResetPasswordRequest,
  type AdminResetPasswordResponse,
  type GetUserStatisticsRequest,
  type GetUserStatisticsResponse,
  type GetUserPermissionsRequest,
  type GetUserPermissionsResponse,
  type BulkUpdateUsersRequest,
  type BulkUpdateUsersResponse,
  type GetFieldPermissionDefaultsRequest,
  type GetFieldPermissionDefaultsResponse,
  type GetFieldPermissionDefaultsForRoleRequest,
  type GetFieldPermissionDefaultsForRoleResponse,
  type ListFieldPermissionOverridesRequest,
  type ListFieldPermissionOverridesResponse,
  type ListFieldPermissionOverridesForRoleRequest,
  type ListFieldPermissionOverridesForRoleResponse,
  type UpsertFieldPermissionRequest,
  type UpsertFieldPermissionResponse,
  type BulkUpsertFieldPermissionsRequest,
  type BulkUpsertFieldPermissionsResponse,
  type DeleteFieldPermissionRequest,
  type DeleteFieldPermissionResponse,
} from '@adopt-dont-shop/proto';

import { startGrpcTimer } from '@adopt-dont-shop/observability';

import { callWithResilience, getOrCreateCircuitBreaker } from './resilience.js';

export type AuthClient = {
  login(req: LoginRequest, metadata: Metadata): Promise<LoginResponse>;
  logout(req: LogoutRequest, metadata: Metadata): Promise<LogoutResponse>;
  refreshToken(req: RefreshTokenRequest, metadata: Metadata): Promise<RefreshTokenResponse>;
  validateToken(req: ValidateTokenRequest, metadata: Metadata): Promise<ValidateTokenResponse>;
  getMe(req: GetMeRequest, metadata: Metadata): Promise<GetMeResponse>;
  assignRole(req: AssignRoleRequest, metadata: Metadata): Promise<AssignRoleResponse>;
  register(req: RegisterRequest, metadata: Metadata): Promise<RegisterResponse>;
  provisionInvitedUser(
    req: ProvisionInvitedUserRequest,
    metadata: Metadata
  ): Promise<ProvisionInvitedUserResponse>;
  verifyEmail(req: VerifyEmailRequest, metadata: Metadata): Promise<VerifyEmailResponse>;
  resendVerification(
    req: ResendVerificationRequest,
    metadata: Metadata
  ): Promise<ResendVerificationResponse>;
  forgotPassword(req: ForgotPasswordRequest, metadata: Metadata): Promise<ForgotPasswordResponse>;
  resetPassword(req: ResetPasswordRequest, metadata: Metadata): Promise<ResetPasswordResponse>;
  redeemInvitation(
    req: RedeemInvitationRequest,
    metadata: Metadata
  ): Promise<RedeemInvitationResponse>;
  changePassword(req: ChangePasswordRequest, metadata: Metadata): Promise<ChangePasswordResponse>;
  setupTwoFactor(req: SetupTwoFactorRequest, metadata: Metadata): Promise<SetupTwoFactorResponse>;
  enableTwoFactor(
    req: EnableTwoFactorRequest,
    metadata: Metadata
  ): Promise<EnableTwoFactorResponse>;
  disableTwoFactor(
    req: DisableTwoFactorRequest,
    metadata: Metadata
  ): Promise<DisableTwoFactorResponse>;
  updateAccount(req: UpdateAccountRequest, metadata: Metadata): Promise<UpdateAccountResponse>;
  listSessions(req: ListSessionsRequest, metadata: Metadata): Promise<ListSessionsResponse>;
  revokeSession(req: RevokeSessionRequest, metadata: Metadata): Promise<RevokeSessionResponse>;
  adminListSessions(
    req: AdminListSessionsRequest,
    metadata: Metadata
  ): Promise<AdminListSessionsResponse>;
  adminRevokeSession(
    req: AdminRevokeSessionRequest,
    metadata: Metadata
  ): Promise<AdminRevokeSessionResponse>;
  adminRevokeAllUserSessions(
    req: AdminRevokeAllUserSessionsRequest,
    metadata: Metadata
  ): Promise<AdminRevokeAllUserSessionsResponse>;
  adminLockAccount(
    req: AdminLockAccountRequest,
    metadata: Metadata
  ): Promise<AdminLockAccountResponse>;
  adminUnlockAccount(
    req: AdminUnlockAccountRequest,
    metadata: Metadata
  ): Promise<AdminUnlockAccountResponse>;
  listIpRules(req: ListIpRulesRequest, metadata: Metadata): Promise<ListIpRulesResponse>;
  createIpRule(req: CreateIpRuleRequest, metadata: Metadata): Promise<CreateIpRuleResponse>;
  deleteIpRule(req: DeleteIpRuleRequest, metadata: Metadata): Promise<DeleteIpRuleResponse>;
  getPrivacyPreferences(
    req: GetPrivacyPreferencesRequest,
    metadata: Metadata
  ): Promise<GetPrivacyPreferencesResponse>;
  updatePrivacyPreferences(
    req: UpdatePrivacyPreferencesRequest,
    metadata: Metadata
  ): Promise<UpdatePrivacyPreferencesResponse>;
  resetPrivacyPreferences(
    req: ResetPrivacyPreferencesRequest,
    metadata: Metadata
  ): Promise<ResetPrivacyPreferencesResponse>;
  searchUsers(req: SearchUsersRequest, metadata: Metadata): Promise<SearchUsersResponse>;
  adminGetUser(req: AdminGetUserRequest, metadata: Metadata): Promise<AdminGetUserResponse>;
  adminCreateUser(
    req: AdminCreateUserRequest,
    metadata: Metadata
  ): Promise<AdminCreateUserResponse>;
  adminUpdateUser(
    req: AdminUpdateUserRequest,
    metadata: Metadata
  ): Promise<AdminUpdateUserResponse>;
  deactivateUser(req: DeactivateUserRequest, metadata: Metadata): Promise<DeactivateUserResponse>;
  reactivateUser(req: ReactivateUserRequest, metadata: Metadata): Promise<ReactivateUserResponse>;
  adminResetPassword(
    req: AdminResetPasswordRequest,
    metadata: Metadata
  ): Promise<AdminResetPasswordResponse>;
  getUserStatistics(
    req: GetUserStatisticsRequest,
    metadata: Metadata
  ): Promise<GetUserStatisticsResponse>;
  getUserPermissions(
    req: GetUserPermissionsRequest,
    metadata: Metadata
  ): Promise<GetUserPermissionsResponse>;
  bulkUpdateUsers(
    req: BulkUpdateUsersRequest,
    metadata: Metadata
  ): Promise<BulkUpdateUsersResponse>;
  getFieldPermissionDefaults(
    req: GetFieldPermissionDefaultsRequest,
    metadata: Metadata
  ): Promise<GetFieldPermissionDefaultsResponse>;
  getFieldPermissionDefaultsForRole(
    req: GetFieldPermissionDefaultsForRoleRequest,
    metadata: Metadata
  ): Promise<GetFieldPermissionDefaultsForRoleResponse>;
  listFieldPermissionOverrides(
    req: ListFieldPermissionOverridesRequest,
    metadata: Metadata
  ): Promise<ListFieldPermissionOverridesResponse>;
  listFieldPermissionOverridesForRole(
    req: ListFieldPermissionOverridesForRoleRequest,
    metadata: Metadata
  ): Promise<ListFieldPermissionOverridesForRoleResponse>;
  upsertFieldPermission(
    req: UpsertFieldPermissionRequest,
    metadata: Metadata
  ): Promise<UpsertFieldPermissionResponse>;
  bulkUpsertFieldPermissions(
    req: BulkUpsertFieldPermissionsRequest,
    metadata: Metadata
  ): Promise<BulkUpsertFieldPermissionsResponse>;
  deleteFieldPermission(
    req: DeleteFieldPermissionRequest,
    metadata: Metadata
  ): Promise<DeleteFieldPermissionResponse>;
  close(): void;
};

export type CreateAuthClientOptions = {
  address: string;
};

// Default per-call deadline. Without one, a hung downstream service
// would hang the gateway request forever; 5s caps the blast radius
// and lets the caller fail fast with DEADLINE_EXCEEDED.
const DEFAULT_DEADLINE_MS = 5_000;

const SERVICE_NAME = 'service.auth';

export const createAuthClient = (opts: CreateAuthClientOptions): AuthClient => {
  const stub = new AuthV1.AuthServiceClient(opts.address, credentials.createInsecure());
  const breaker = getOrCreateCircuitBreaker(SERVICE_NAME);

  const callUnary = <Req, Res>(
    fn: (
      req: Req,
      metadata: Metadata,
      options: Partial<CallOptions>,
      cb: (err: unknown, res: Res) => void
    ) => unknown,
    req: Req,
    metadata: Metadata,
    idempotent: boolean
  ): Promise<Res> =>
    callWithResilience<Res>(
      deadline =>
        new Promise<Res>((resolve, reject) => {
          const options: Partial<CallOptions> = { deadline };
          const method = fn.name || 'unknown';
          const stop = startGrpcTimer(SERVICE_NAME, method, 'out');
          fn.call(stub, req, metadata, options, (err: unknown, res: Res) => {
            const code =
              err &&
              typeof err === 'object' &&
              'code' in err &&
              typeof (err as { code?: unknown }).code === 'number'
                ? (err as { code: number }).code
                : err
                  ? 2 // UNKNOWN
                  : 0;
            stop(code);
            if (err) {
              reject(err);
              return;
            }
            resolve(res);
          });
        }),
      {
        service: SERVICE_NAME,
        deadlineMs: DEFAULT_DEADLINE_MS,
        idempotent,
        circuitBreaker: breaker,
      }
    );

  return {
    // ── Non-idempotent (writes / auth mutations) ─────────────────────
    login: (req, metadata) => callUnary(stub.login, req, metadata, false),
    logout: (req, metadata) => callUnary(stub.logout, req, metadata, false),
    refreshToken: (req, metadata) => callUnary(stub.refreshToken, req, metadata, false),
    register: (req, metadata) => callUnary(stub.register, req, metadata, false),
    provisionInvitedUser: (req, metadata) =>
      callUnary(stub.provisionInvitedUser, req, metadata, false),
    verifyEmail: (req, metadata) => callUnary(stub.verifyEmail, req, metadata, false),
    resendVerification: (req, metadata) => callUnary(stub.resendVerification, req, metadata, false),
    forgotPassword: (req, metadata) => callUnary(stub.forgotPassword, req, metadata, false),
    resetPassword: (req, metadata) => callUnary(stub.resetPassword, req, metadata, false),
    redeemInvitation: (req, metadata) => callUnary(stub.redeemInvitation, req, metadata, false),
    changePassword: (req, metadata) => callUnary(stub.changePassword, req, metadata, false),
    setupTwoFactor: (req, metadata) => callUnary(stub.setupTwoFactor, req, metadata, false),
    enableTwoFactor: (req, metadata) => callUnary(stub.enableTwoFactor, req, metadata, false),
    disableTwoFactor: (req, metadata) => callUnary(stub.disableTwoFactor, req, metadata, false),
    updateAccount: (req, metadata) => callUnary(stub.updateAccount, req, metadata, false),
    revokeSession: (req, metadata) => callUnary(stub.revokeSession, req, metadata, false),
    adminRevokeSession: (req, metadata) => callUnary(stub.adminRevokeSession, req, metadata, false),
    adminRevokeAllUserSessions: (req, metadata) =>
      callUnary(stub.adminRevokeAllUserSessions, req, metadata, false),
    adminLockAccount: (req, metadata) => callUnary(stub.adminLockAccount, req, metadata, false),
    adminUnlockAccount: (req, metadata) => callUnary(stub.adminUnlockAccount, req, metadata, false),
    createIpRule: (req, metadata) => callUnary(stub.createIpRule, req, metadata, false),
    deleteIpRule: (req, metadata) => callUnary(stub.deleteIpRule, req, metadata, false),
    updatePrivacyPreferences: (req, metadata) =>
      callUnary(stub.updatePrivacyPreferences, req, metadata, false),
    resetPrivacyPreferences: (req, metadata) =>
      callUnary(stub.resetPrivacyPreferences, req, metadata, false),
    assignRole: (req, metadata) => callUnary(stub.assignRole, req, metadata, false),
    adminUpdateUser: (req, metadata) => callUnary(stub.adminUpdateUser, req, metadata, false),
    adminCreateUser: (req, metadata) => callUnary(stub.adminCreateUser, req, metadata, false),
    deactivateUser: (req, metadata) => callUnary(stub.deactivateUser, req, metadata, false),
    reactivateUser: (req, metadata) => callUnary(stub.reactivateUser, req, metadata, false),
    bulkUpdateUsers: (req, metadata) => callUnary(stub.bulkUpdateUsers, req, metadata, false),
    adminResetPassword: (req, metadata) => callUnary(stub.adminResetPassword, req, metadata, false),
    upsertFieldPermission: (req, metadata) =>
      callUnary(stub.upsertFieldPermission, req, metadata, false),
    bulkUpsertFieldPermissions: (req, metadata) =>
      callUnary(stub.bulkUpsertFieldPermissions, req, metadata, false),
    deleteFieldPermission: (req, metadata) =>
      callUnary(stub.deleteFieldPermission, req, metadata, false),
    // ── Idempotent (reads / validation) ─────────────────────────────
    validateToken: (req, metadata) => callUnary(stub.validateToken, req, metadata, true),
    getMe: (req, metadata) => callUnary(stub.getMe, req, metadata, true),
    listSessions: (req, metadata) => callUnary(stub.listSessions, req, metadata, true),
    adminListSessions: (req, metadata) => callUnary(stub.adminListSessions, req, metadata, true),
    listIpRules: (req, metadata) => callUnary(stub.listIpRules, req, metadata, true),
    getPrivacyPreferences: (req, metadata) =>
      callUnary(stub.getPrivacyPreferences, req, metadata, true),
    searchUsers: (req, metadata) => callUnary(stub.searchUsers, req, metadata, true),
    adminGetUser: (req, metadata) => callUnary(stub.adminGetUser, req, metadata, true),
    getUserStatistics: (req, metadata) => callUnary(stub.getUserStatistics, req, metadata, true),
    getUserPermissions: (req, metadata) => callUnary(stub.getUserPermissions, req, metadata, true),
    getFieldPermissionDefaults: (req, metadata) =>
      callUnary(stub.getFieldPermissionDefaults, req, metadata, true),
    getFieldPermissionDefaultsForRole: (req, metadata) =>
      callUnary(stub.getFieldPermissionDefaultsForRole, req, metadata, true),
    listFieldPermissionOverrides: (req, metadata) =>
      callUnary(stub.listFieldPermissionOverrides, req, metadata, true),
    listFieldPermissionOverridesForRole: (req, metadata) =>
      callUnary(stub.listFieldPermissionOverridesForRole, req, metadata, true),
    close: () => stub.close(),
  };
};
