import { apiService } from './libraryServices';

export type BroadcastAudience = 'all' | 'all-rescues' | 'all-adopters' | 'all-staff';
export type BroadcastChannel = 'in_app' | 'email' | 'push' | 'sms';

export type BroadcastResult = {
  audience: BroadcastAudience;
  targetCount: number;
  deliveredInApp: number;
  skippedByPrefs: number;
  skippedByDnd: number;
  channels: BroadcastChannel[];
};

export type SendBroadcastInput = {
  audience: BroadcastAudience;
  title: string;
  body: string;
  channels: BroadcastChannel[];
  idempotencyKey: string;
};

type SuccessEnvelope<T> = { success: true; data: T; message?: string };
type ErrorEnvelope = { success: false; message?: string; error?: string };

/**
 * ADS-107: thin client over the backend broadcast endpoint. The
 * idempotency key is sent via the `Idempotency-Key` header the
 * server's shared idempotency middleware understands — a retry with
 * the same key inside 24h replays the cached response, so the user
 * isn't punished for an unreliable network.
 */
export const sendBroadcast = async (input: SendBroadcastInput): Promise<BroadcastResult> => {
  const response = await apiService.fetchWithAuth<SuccessEnvelope<BroadcastResult> | ErrorEnvelope>(
    '/api/v1/notifications/broadcast',
    {
      method: 'POST',
      headers: { 'Idempotency-Key': input.idempotencyKey },
      body: {
        audience: input.audience,
        title: input.title,
        body: input.body,
        channels: input.channels,
      },
    }
  );

  if (!response || response.success !== true) {
    const message = response?.message ?? 'Failed to send broadcast';
    throw new Error(message);
  }

  return response.data;
};

export const previewBroadcastAudience = async (audience: BroadcastAudience): Promise<number> => {
  const response = await apiService.get<
    SuccessEnvelope<{ audience: BroadcastAudience; count: number }> | ErrorEnvelope
  >('/api/v1/notifications/broadcast/preview', { audience });

  if (!response || response.success !== true) {
    throw new Error('Failed to preview audience');
  }

  return response.data.count;
};
