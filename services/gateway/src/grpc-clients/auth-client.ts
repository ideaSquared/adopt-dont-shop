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

import { credentials, Metadata } from '@grpc/grpc-js';

import {
  AuthV1,
  type AssignRoleRequest,
  type AssignRoleResponse,
  type ChangePasswordRequest,
  type ChangePasswordResponse,
  type ForgotPasswordRequest,
  type ForgotPasswordResponse,
  type GetMeRequest,
  type GetMeResponse,
  type LoginRequest,
  type LoginResponse,
  type LogoutRequest,
  type LogoutResponse,
  type RefreshTokenRequest,
  type RefreshTokenResponse,
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
} from '@adopt-dont-shop/proto';

export type AuthClient = {
  login(req: LoginRequest, metadata: Metadata): Promise<LoginResponse>;
  logout(req: LogoutRequest, metadata: Metadata): Promise<LogoutResponse>;
  refreshToken(req: RefreshTokenRequest, metadata: Metadata): Promise<RefreshTokenResponse>;
  validateToken(req: ValidateTokenRequest, metadata: Metadata): Promise<ValidateTokenResponse>;
  getMe(req: GetMeRequest, metadata: Metadata): Promise<GetMeResponse>;
  assignRole(req: AssignRoleRequest, metadata: Metadata): Promise<AssignRoleResponse>;
  register(req: RegisterRequest, metadata: Metadata): Promise<RegisterResponse>;
  verifyEmail(req: VerifyEmailRequest, metadata: Metadata): Promise<VerifyEmailResponse>;
  resendVerification(
    req: ResendVerificationRequest,
    metadata: Metadata
  ): Promise<ResendVerificationResponse>;
  forgotPassword(req: ForgotPasswordRequest, metadata: Metadata): Promise<ForgotPasswordResponse>;
  resetPassword(req: ResetPasswordRequest, metadata: Metadata): Promise<ResetPasswordResponse>;
  changePassword(req: ChangePasswordRequest, metadata: Metadata): Promise<ChangePasswordResponse>;
  updateAccount(req: UpdateAccountRequest, metadata: Metadata): Promise<UpdateAccountResponse>;
  close(): void;
};

export type CreateAuthClientOptions = {
  address: string;
};

export const createAuthClient = (opts: CreateAuthClientOptions): AuthClient => {
  const stub = new AuthV1.AuthServiceClient(opts.address, credentials.createInsecure());

  const callUnary = <Req, Res>(
    fn: (req: Req, metadata: Metadata, cb: (err: unknown, res: Res) => void) => unknown,
    req: Req,
    metadata: Metadata
  ): Promise<Res> =>
    new Promise<Res>((resolve, reject) => {
      fn.call(stub, req, metadata, (err: unknown, res: Res) => {
        if (err) {
          reject(err);
          return;
        }
        resolve(res);
      });
    });

  return {
    login: (req, metadata) => callUnary(stub.login, req, metadata),
    logout: (req, metadata) => callUnary(stub.logout, req, metadata),
    refreshToken: (req, metadata) => callUnary(stub.refreshToken, req, metadata),
    validateToken: (req, metadata) => callUnary(stub.validateToken, req, metadata),
    getMe: (req, metadata) => callUnary(stub.getMe, req, metadata),
    assignRole: (req, metadata) => callUnary(stub.assignRole, req, metadata),
    register: (req, metadata) => callUnary(stub.register, req, metadata),
    verifyEmail: (req, metadata) => callUnary(stub.verifyEmail, req, metadata),
    resendVerification: (req, metadata) => callUnary(stub.resendVerification, req, metadata),
    forgotPassword: (req, metadata) => callUnary(stub.forgotPassword, req, metadata),
    resetPassword: (req, metadata) => callUnary(stub.resetPassword, req, metadata),
    changePassword: (req, metadata) => callUnary(stub.changePassword, req, metadata),
    updateAccount: (req, metadata) => callUnary(stub.updateAccount, req, metadata),
    close: () => stub.close(),
  };
};
