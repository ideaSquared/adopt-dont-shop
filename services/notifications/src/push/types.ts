// Push provider types. Mirrors the email module's shape: providers
// depend on plain TS types, never on pg/Sequelize. The push worker
// converts DB rows to PushSendRequest before invoking the provider.

export type DevicePlatform = 'ios' | 'android' | 'web';
export type DeviceTokenStatus = 'active' | 'inactive' | 'expired' | 'invalid';

export type PushSendRequest = {
  token: string;
  platform: DevicePlatform;
  title: string;
  body: string;
  // Opaque payload passed through to the device. For FCM this becomes
  // `message.data`; for web-push it becomes JSON on the service worker.
  data?: Record<string, unknown>;
};

export type PushSendResult = {
  success: boolean;
  messageId?: string;
  error?: string;
  // Set to true when the provider reports the token is permanently
  // invalid (NotRegistered / InvalidArgument). The worker marks the
  // device_token row `status='invalid'` so subsequent sends skip it.
  tokenInvalid?: boolean;
};

export type PushProvider = {
  send(request: PushSendRequest): Promise<PushSendResult>;
  getName(): string;
  validateConfiguration(): boolean;
};
