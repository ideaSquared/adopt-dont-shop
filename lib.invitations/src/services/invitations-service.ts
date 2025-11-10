import { ApiService } from '@adopt-dont-shop/lib-api';
import {
  InvitationsServiceConfig,
  InvitationPayload,
  InvitationDetails,
  PendingInvitation,
  AcceptInvitationPayload,
  SendInvitationResponse,
  AcceptInvitationResponse,
} from '../types';

/**
 * InvitationsService - Handles staff invitation operations
 *
 * Features:
 * - Send email invitations to new staff members
 * - Manage pending invitations
 * - Cancel invitations
 * - Accept invitations (public - no auth required)
 * - Get invitation details
 */
export class InvitationsService {
  private apiService: ApiService;
  private config: InvitationsServiceConfig;

  constructor(apiService?: ApiService, config: InvitationsServiceConfig = {}) {
    this.apiService = apiService || new ApiService();
    this.config = {
      apiUrl: 'http://localhost:5000',
      debug: false,
      ...config,
    };

    if (this.config.debug) {
      console.log(`${InvitationsService.name} initialized with config:`, this.config);
    }
  }

  /**
   * Update service configuration
   */
  updateConfig(config: Partial<InvitationsServiceConfig>): void {
    this.config = { ...this.config, ...config };
    if (config.apiUrl) {
      this.apiService.updateConfig({ apiUrl: config.apiUrl });
    }
  }

  /**
   * Get current configuration
   */
  getConfig(): InvitationsServiceConfig {
    return { ...this.config };
  }

  /**
   * Send an invitation to a new staff member
   */
  async sendInvitation(
    rescueId: string,
    payload: InvitationPayload
  ): Promise<SendInvitationResponse> {
    try {
      const response = await this.apiService.post<SendInvitationResponse>(
        `/api/v1/rescues/${rescueId}/invitations`,
        payload
      );

      if (this.config.debug) {
        console.log(`Invitation sent to ${payload.email}`, response);
      }

      return response;
    } catch (error) {
      if (this.config.debug) {
        console.error('Failed to send invitation:', error);
      }
      throw error;
    }
  }

  /**
   * Get pending invitations for a rescue
   */
  async getPendingInvitations(rescueId: string): Promise<PendingInvitation[]> {
    try {
      const response = await this.apiService.get<{
        success: boolean;
        invitations: PendingInvitation[];
      }>(`/api/v1/rescues/${rescueId}/invitations`);

      if (response.success && Array.isArray(response.invitations)) {
        return response.invitations;
      }

      // Fallback for different response formats
      if (Array.isArray(response)) {
        return response;
      }

      return [];
    } catch (error) {
      if (this.config.debug) {
        console.error('Failed to get pending invitations:', error);
      }
      return [];
    }
  }

  /**
   * Cancel a pending invitation
   */
  async cancelInvitation(rescueId: string, invitationId: number): Promise<void> {
    try {
      await this.apiService.delete(`/api/v1/rescues/${rescueId}/invitations/${invitationId}`);

      if (this.config.debug) {
        console.log(`Invitation ${invitationId} cancelled`);
      }
    } catch (error) {
      if (this.config.debug) {
        console.error('Failed to cancel invitation:', error);
      }
      throw error;
    }
  }

  /**
   * Get invitation details (public - no auth required)
   */
  async getInvitationDetails(token: string): Promise<InvitationDetails | null> {
    try {
      const response = await this.apiService.get<{
        success: boolean;
        invitation: InvitationDetails;
      }>(`/api/v1/invitations/details/${token}`);

      if (response.success && response.invitation) {
        return response.invitation;
      }

      return null;
    } catch (error) {
      if (this.config.debug) {
        console.error('Failed to get invitation details:', error);
      }
      return null;
    }
  }

  /**
   * Accept an invitation (public - no auth required)
   */
  async acceptInvitation(payload: AcceptInvitationPayload): Promise<AcceptInvitationResponse> {
    try {
      const response = await this.apiService.post<AcceptInvitationResponse>(
        '/api/v1/invitations/accept',
        payload
      );

      if (this.config.debug) {
        console.log('Invitation accepted', response);
      }

      return response;
    } catch (error) {
      if (this.config.debug) {
        console.error('Failed to accept invitation:', error);
      }
      throw error;
    }
  }

  /**
   * Health check method
   */
  async healthCheck(): Promise<boolean> {
    try {
      // Could ping an endpoint if needed
      return true;
    } catch (error) {
      if (this.config.debug) {
        console.error(`${InvitationsService.name} health check failed:`, error);
      }
      return false;
    }
  }
}
