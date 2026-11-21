// NATS → gateway membership-cache invalidation (ENG-1508).
//
// authenticate.ts memoises each rescue-staff user's rescueId for minutes, and
// service handlers authorise on the stamped principal.rescueId without
// re-checking membership. service.rescue publishes rescue.staffMemberRemoved
// after the removal commits; this drops the user's cached entry so their next
// request re-resolves membership (NOT_FOUND → no x-rescue-id).
//
// Every replica must see the event (each holds its own in-process cache), so
// each gets its own deliverNew durable, same as auth-subscriber.ts.

import { randomUUID } from 'node:crypto';

import type { NatsConnection } from 'nats';

import { subscribe, type SubscriptionHandle } from '@adopt-dont-shop/events';

import { invalidateRescueIdCache } from '../middleware/authenticate.js';
import { type ServiceLogger } from '../logger.js';

const REPLICA_ID = randomUUID();

export type RegisterRescueMembershipSubscribersOptions = {
  nats: NatsConnection;
  logger: ServiceLogger;
};

// Mirrors what service.rescue publishes (staff-foster-handlers.ts).
type StaffMemberRemovedPayload = {
  staffMemberId: string;
  rescueId: string;
  userId: string;
};

export const registerRescueMembershipSubscribers = (
  opts: RegisterRescueMembershipSubscribersOptions
): SubscriptionHandle[] => {
  const { nats, logger } = opts;
  const subject = 'rescue.staffMemberRemoved';

  const handle = subscribe<StaffMemberRemovedPayload>(
    nats,
    {
      subject,
      durable: `gw-rescue-membership-${subject.replace(/\./g, '-')}-${REPLICA_ID}`,
      deliverNew: true,
      onError: (err, ctx) => {
        logger.error('rescue membership subscriber failed', { subject: ctx.subject }, err);
      },
    },
    payload => {
      invalidateRescueIdCache(payload.userId);
      logger.info('rescue membership cache invalidated', { userId: payload.userId });
    }
  );

  return [handle];
};
