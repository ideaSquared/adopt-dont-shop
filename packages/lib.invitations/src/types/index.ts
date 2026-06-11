import type { ServiceConfig, ServiceOptions } from '@adopt-dont-shop/lib.types';

export type InvitationsServiceConfig = ServiceConfig;
export type InvitationsServiceOptions = ServiceOptions;

/**
 * Payload for sending an invitation
 */
export interface InvitationPayload {
  email: string;
  title?: string;
}

/**
 * Invitation details (public - no auth)
 *
 * C2-4: `rescueName`, `invitedByName`, and `role` are surfaced so the
 * AcceptInvitation page can give the invitee context about who invited
 * them and where to. All three are optional to remain backward-
 * compatible with older backend deployments that don't return them.
 */
export interface InvitationDetails {
  email: string;
  expiresAt: string;
  rescueName?: string | null;
  invitedByName?: string | null;
  role?: string | null;
}

/**
 * Pending invitation
 */
export interface PendingInvitation {
  invitation_id: number;
  email: string;
  title?: string;
  invited_by?: string;
  created_at: string;
  expiration: string;
}

/**
 * Payload for accepting an invitation
 */
export interface AcceptInvitationPayload {
  token: string;
  firstName: string;
  lastName: string;
  password: string;
  title?: string;
}

/**
 * Response from sending an invitation
 */
export interface SendInvitationResponse {
  success: boolean;
  message: string;
  invitationId?: number;
}

/**
 * Response from accepting an invitation
 */
export interface AcceptInvitationResponse {
  success: boolean;
  message: string;
  userId?: string;
}

// ADS-262: response envelopes are owned by @adopt-dont-shop/lib.types.
export type { BaseResponse, ErrorResponse, PaginatedResponse } from '@adopt-dont-shop/lib.types';
