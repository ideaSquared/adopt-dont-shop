// FcmPushProvider — scaffold that mirrors the monolith's deferred
// vendor wiring (service.backend/src/services/push-providers/fcm-provider.ts).
// `firebase-admin` integration isn't in this repo yet; the provider
// fails closed when selected so the boot path surfaces the misconfig
// rather than silently swallowing pushes.
//
// When the vendor SDK is wired in, swap the body of `send()` for a
// `messaging().send({...})` call and map the FCM error codes (`messaging/
// registration-token-not-registered`, `messaging/invalid-registration-
// token`) onto `tokenInvalid: true` so the worker marks the device_token
// row `status='invalid'`.

import type { createLogger } from '@adopt-dont-shop/observability';

import type { PushProvider, PushSendRequest, PushSendResult } from '../types.js';

export type FcmConfig = {
  // GCP service-account JSON, supplied via FCM_SERVICE_ACCOUNT_JSON env.
  serviceAccountJson: string;
  // GCP project ID, supplied via FCM_PROJECT_ID env.
  projectId: string;
};

export type FcmDeps = {
  config: FcmConfig;
  logger: ReturnType<typeof createLogger>;
};

export const createFcmPushProvider = (deps: FcmDeps): PushProvider => ({
  async send(request: PushSendRequest): Promise<PushSendResult> {
    deps.logger.error('push.fcm.not_implemented', {
      tokenPreview: `${request.token.slice(0, 10)}…`,
      title: request.title,
    });
    return {
      success: false,
      error: 'FCM provider not implemented — vendor wiring required',
    };
  },
  getName: () => 'fcm',
  validateConfiguration: () =>
    Boolean(deps.config.serviceAccountJson) && Boolean(deps.config.projectId),
});
