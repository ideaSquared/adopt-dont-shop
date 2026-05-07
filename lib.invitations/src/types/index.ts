/**
 * Configuration options for InvitationsService
 */
export interface InvitationsServiceConfig {
  /**
   * API base URL
   */
  apiUrl?: string;

  /**
   * Enable debug logging
   */
  debug?: boolean;
}

/**
 * Options for InvitationsService operations
 */
export interface InvitationsServiceOptions {
  /**
   * Timeout in milliseconds
   */
  timeout?: number;

  /**
   * Custom metadata
   */
  metadata?: Record<string, unknown>;
}

/**
 * Payload for sending an invitation
 */
export interface InvitationPayload {
  email: string;
  title?: string;
}

/**
 * Invitation details (public - no auth)
 */
export interface InvitationDetails {
  email: string;
  expiresAt: string;
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
