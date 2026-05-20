import { DevicePlatform } from '../../models/DeviceToken';

export type PushSendRequest = {
  token: string;
  platform: DevicePlatform;
  title: string;
  body: string;
  data?: Record<string, unknown>;
};

export type PushSendResult = {
  success: boolean;
  messageId?: string;
  error?: string;
};

export interface PushProvider {
  send(request: PushSendRequest): Promise<PushSendResult>;
  getName(): string;
  validateConfiguration(): boolean;
}

export abstract class BasePushProvider implements PushProvider {
  abstract send(request: PushSendRequest): Promise<PushSendResult>;
  abstract getName(): string;
  abstract validateConfiguration(): boolean;

  protected generateMessageId(): string {
    return `push_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;
  }
}
