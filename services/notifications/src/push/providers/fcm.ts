// FcmPushProvider — production push provider backed by Firebase Cloud
// Messaging. Lazily initialises a firebase-admin app (guarded against
// double-init) from the GCP service-account JSON in FcmConfig, then
// sends via messaging().send(). FCM error codes `messaging/registration-
// token-not-registered` and `messaging/invalid-registration-token` map
// onto `tokenInvalid: true` so the worker marks the device_token row
// `status='invalid'`.

import { cert, getApps, initializeApp, type App } from 'firebase-admin/app';
import { getMessaging } from 'firebase-admin/messaging';

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

// FCM error codes that mean the token is permanently dead (app
// uninstalled / token rotated) rather than a transient send failure.
const TOKEN_INVALID_ERROR_CODES = new Set([
  'messaging/registration-token-not-registered',
  'messaging/invalid-registration-token',
]);

type ServiceAccountJson = {
  projectId: string;
  clientEmail: string;
  privateKey: string;
};

// Parses the raw GCP-downloaded service-account JSON (snake_case keys)
// into the shape firebase-admin's cert() documents (camelCase), so the
// call site matches the public API rather than relying on cert()'s
// internal snake_case fallback.
const parseServiceAccountJson = (raw: string): ServiceAccountJson | undefined => {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return undefined;
  }
  if (
    typeof parsed === 'object' &&
    parsed !== null &&
    'project_id' in parsed &&
    'client_email' in parsed &&
    'private_key' in parsed &&
    typeof parsed.project_id === 'string' &&
    typeof parsed.client_email === 'string' &&
    typeof parsed.private_key === 'string'
  ) {
    return {
      projectId: parsed.project_id,
      clientEmail: parsed.client_email,
      privateKey: parsed.private_key,
    };
  }
  return undefined;
};

type FirebaseLikeError = { code: string; message: string };

const asFirebaseError = (err: unknown): FirebaseLikeError | undefined => {
  if (
    typeof err === 'object' &&
    err !== null &&
    'code' in err &&
    'message' in err &&
    typeof err.code === 'string' &&
    typeof err.message === 'string'
  ) {
    return { code: err.code, message: err.message };
  }
  return undefined;
};

// FCM's `data` payload must be a flat string map. PushSendRequest carries
// opaque unknown values (the shape is shared with future providers), so
// non-string values are JSON-stringified rather than dropped.
const toDataPayload = (data: PushSendRequest['data']): Record<string, string> | undefined => {
  if (!data) {
    return undefined;
  }
  return Object.fromEntries(
    Object.entries(data).map(([key, value]) => [
      key,
      typeof value === 'string' ? value : JSON.stringify(value),
    ])
  );
};

export const createFcmPushProvider = (deps: FcmDeps): PushProvider => {
  let app: App | undefined;

  const getOrCreateApp = (): App => {
    if (app) {
      return app;
    }
    const [existing] = getApps();
    if (existing) {
      app = existing;
      return app;
    }
    const serviceAccount = parseServiceAccountJson(deps.config.serviceAccountJson);
    if (!serviceAccount) {
      throw new Error('FCM_SERVICE_ACCOUNT_JSON is not valid service-account JSON');
    }
    app = initializeApp({
      credential: cert(serviceAccount),
      projectId: deps.config.projectId,
    });
    return app;
  };

  return {
    async send(request: PushSendRequest): Promise<PushSendResult> {
      const tokenPreview = `${request.token.slice(0, 10)}…`;
      try {
        const messageId = await getMessaging(getOrCreateApp()).send({
          token: request.token,
          notification: { title: request.title, body: request.body },
          data: toDataPayload(request.data),
        });
        deps.logger.info('push.fcm.send_ok', { tokenPreview, messageId });
        return { success: true, messageId };
      } catch (err) {
        const firebaseError = asFirebaseError(err);
        if (firebaseError && TOKEN_INVALID_ERROR_CODES.has(firebaseError.code)) {
          deps.logger.warn('push.fcm.token_invalid', {
            tokenPreview,
            code: firebaseError.code,
          });
          return { success: false, error: firebaseError.message, tokenInvalid: true };
        }
        const message =
          firebaseError?.message ?? (err instanceof Error ? err.message : String(err));
        deps.logger.error('push.fcm.send_error', { tokenPreview, error: message });
        return { success: false, error: message };
      }
    },
    getName: () => 'fcm',
    validateConfiguration: () =>
      Boolean(parseServiceAccountJson(deps.config.serviceAccountJson)) &&
      Boolean(deps.config.projectId),
  };
};
