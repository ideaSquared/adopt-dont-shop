import logger from '../../utils/logger';
import { BasePushProvider, PushSendRequest, PushSendResult } from './base-provider';

export type FcmConfig = {
  serviceAccountJson?: string;
  projectId?: string;
};

/**
 * FCM push provider scaffold. Vendor wiring deferred — install
 * `firebase-admin` and dispatch via `messaging().send({...})` when ready.
 * Until then this provider fails fail-closed when selected.
 */
export class FcmPushProvider extends BasePushProvider {
  private readonly config: FcmConfig;

  constructor(fcmConfig: FcmConfig) {
    super();
    this.config = fcmConfig;
  }

  async send(request: PushSendRequest): Promise<PushSendResult> {
    logger.error('FcmPushProvider invoked but implementation not wired', {
      tokenPreview: `${request.token.substring(0, 10)}...`,
    });
    return {
      success: false,
      error: 'FCM provider not implemented — vendor wiring required',
    };
  }

  getName(): string {
    return 'fcm';
  }

  validateConfiguration(): boolean {
    return Boolean(this.config.serviceAccountJson && this.config.projectId);
  }
}
