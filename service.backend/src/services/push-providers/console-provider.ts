import logger from '../../utils/logger';
import { BasePushProvider, PushSendRequest, PushSendResult } from './base-provider';

/**
 * Dev/test push provider. Logs the notification rather than dispatching
 * to FCM/APNs. Default in dev so local environments don't need vendor
 * credentials.
 */
export class ConsolePushProvider extends BasePushProvider {
  async send(request: PushSendRequest): Promise<PushSendResult> {
    const messageId = this.generateMessageId();
    logger.info('Console push notification sent', {
      messageId,
      tokenPreview: `${request.token.substring(0, 10)}...`,
      platform: request.platform,
      title: request.title,
      body: request.body,
    });
    return { success: true, messageId };
  }

  getName(): string {
    return 'console';
  }

  validateConfiguration(): boolean {
    return true;
  }
}
