// Verification, password-reset and rescue staff invitation emails.
//
// service.auth publishes auth.userRegistered (new account, and the resend
// variant) and auth.passwordResetRequested; service.rescue publishes
// rescue.staffInvited (the invitee has no account yet, so no first name).
// Each carries the recipient's address and the raw one-time token. This module turns them into
// queued emails for the existing email worker (email_queue), keyed so a
// redelivered event never sends a second email.
//
// Why these do not go through the notification -> notifications.created ->
// email channel adapter path used for in-app notifications: that path stores
// the message in notifications.notifications (visible in the in-app list) and
// renders it as plain escaped text. A one-time token should not be persisted
// in an in-app row, and the link has to be clickable. The email_queue row is
// the only place the link is stored.
//
// The event carries the token, so the notifications service never reads the
// auth schema. The token and the address are never logged.

import { createHash, randomUUID } from 'node:crypto';

import type { NatsConnection } from 'nats';
import type { Pool } from 'pg';
import type { Logger } from 'winston';

import { subscribe, type SubscriptionHandle } from '@adopt-dont-shop/events';

import { escapeHtml } from '../email/escape-html.js';
import { insertEmail } from '../email/queue.js';

import type { RescueStaffInvitedEvent } from './event-types.js';

export type AuthEmailConfig = {
  // Client app origin the links point at (FRONTEND_URL).
  frontendUrl: string;
  // Rescue app origin the staff invitation link points at (RESCUE_FRONTEND_URL).
  rescueAppUrl: string;
  fromEmail: string;
  fromName: string;
};

export type RegisterAuthEmailSubscribersOptions = {
  nats: NatsConnection;
  pool: Pool;
  logger: Logger;
  config: AuthEmailConfig;
  onError: (err: unknown, ctx: { subject: string }) => void;
  // Injectable clock for tests.
  now?: () => Date;
};

// auth.userRegistered — also published by the resend-verification and the
// rescue-owner sign-up paths, with a different event id each time.
type UserRegisteredEvent = {
  userId?: string;
  email?: string;
  firstName?: string;
  verificationToken?: string;
  verificationExpiresAt?: string;
};

type PasswordResetRequestedEvent = {
  userId?: string;
  email?: string;
  firstName?: string;
  resetToken?: string;
  resetExpiresAt?: string;
};

const DURABLE_PREFIX = 'notifications-workers';
const durableFor = (subject: string): string => `${DURABLE_PREFIX}-${subject.replace(/\./g, '-')}`;

const APP_NAME = "Adopt Don't Shop";

type RenderedEmail = { subject: string; html: string; text: string };

const link = (frontendUrl: string, path: string, token: string): string =>
  `${frontendUrl.replace(/\/+$/, '')}${path}?token=${encodeURIComponent(token)}`;

// "8 November 2026 at 14:30 UTC" — fixed zone so the wording does not depend on
// the server's locale or timezone.
const formatExpiry = (iso: string | undefined): string | undefined => {
  if (!iso) {
    return undefined;
  }
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) {
    return undefined;
  }
  const day = date.toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  });
  const time = date.toLocaleTimeString('en-GB', {
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'UTC',
  });
  return `${day} at ${time} UTC`;
};

const render = (parts: {
  subject: string;
  greetingName: string | undefined;
  lines: string[];
  linkText: string;
  url: string;
  expiry: string | undefined;
  closing: string;
}): RenderedEmail => {
  const greeting = parts.greetingName ? `Hello ${parts.greetingName},` : 'Hello,';
  const expiryLine = parts.expiry
    ? `This link can only be used once and expires on ${parts.expiry}.`
    : 'This link can only be used once.';
  const text = [
    greeting,
    '',
    ...parts.lines,
    '',
    parts.url,
    '',
    expiryLine,
    parts.closing,
    '',
    `The ${APP_NAME} team`,
  ].join('\n');
  const html = [
    `<p>${escapeHtml(greeting)}</p>`,
    ...parts.lines.map(line => `<p>${escapeHtml(line)}</p>`),
    `<p><a href="${escapeHtml(parts.url)}">${escapeHtml(parts.linkText)}</a></p>`,
    `<p>${escapeHtml(expiryLine)} ${escapeHtml(parts.closing)}</p>`,
    `<p>The ${escapeHtml(APP_NAME)} team</p>`,
  ].join('');
  return { subject: parts.subject, html, text };
};

export const renderVerificationEmail = (
  event: UserRegisteredEvent,
  frontendUrl: string
): RenderedEmail =>
  render({
    subject: `Verify your email address for ${APP_NAME}`,
    greetingName: event.firstName,
    lines: [
      `Thank you for signing up to ${APP_NAME}. Please confirm your email address to finish setting up your account.`,
    ],
    linkText: 'Verify my email address',
    url: link(frontendUrl, '/verify-email', event.verificationToken ?? ''),
    expiry: formatExpiry(event.verificationExpiresAt),
    closing: 'If you did not create an account, you can ignore this email.',
  });

export const renderPasswordResetEmail = (
  event: PasswordResetRequestedEvent,
  frontendUrl: string
): RenderedEmail =>
  render({
    subject: `Reset your password for ${APP_NAME}`,
    greetingName: event.firstName,
    lines: [`We received a request to reset the password for your ${APP_NAME} account.`],
    linkText: 'Choose a new password',
    url: link(frontendUrl, '/reset-password', event.resetToken ?? ''),
    expiry: formatExpiry(event.resetExpiresAt),
    closing:
      'If you did not ask for this, you can ignore this email and your password will stay the same.',
  });

export const renderStaffInvitationEmail = (
  event: RescueStaffInvitedEvent,
  rescueAppUrl: string
): RenderedEmail =>
  render({
    subject: `You have been invited to join a rescue on ${APP_NAME}`,
    greetingName: undefined,
    lines: [
      `You have been invited to join a rescue team on ${APP_NAME}. Accept the invitation to set up your account and start helping animals find homes.`,
    ],
    linkText: 'Accept the invitation',
    url: link(rescueAppUrl, '/accept-invitation', event.token ?? ''),
    expiry: formatExpiry(event.expiration),
    closing: 'If you were not expecting this invitation, you can ignore this email.',
  });

// A replayed event can outlive its token (JetStream keeps events for days;
// verification links last 24 hours and reset links one hour). An email whose
// link is already dead only confuses, so the event is acknowledged unsent.
const isExpired = (expiresAt: string | undefined, now: Date): boolean => {
  if (!expiresAt) {
    return false;
  }
  const expiry = new Date(expiresAt).getTime();
  return !Number.isNaN(expiry) && expiry <= now.getTime();
};

// email_queue.idempotency_key is varchar(64): hash the namespaced event id
// (UUID-based ids make the readable key longer than that).
const idempotencyKeyFor = (subject: string, eventId: string): string =>
  createHash('sha256').update(`auth-email:${subject}:${eventId}`).digest('hex');

const enqueue = async (
  opts: RegisterAuthEmailSubscribersOptions,
  subject: string,
  eventId: string | undefined,
  event: { userId?: string; email?: string; firstName?: string },
  email: RenderedEmail
): Promise<void> => {
  try {
    await insertEmail(opts.pool, {
      emailId: randomUUID(),
      fromEmail: opts.config.fromEmail,
      fromName: opts.config.fromName,
      toEmail: event.email as string,
      toName: event.firstName ?? null,
      subject: email.subject,
      htmlContent: email.html,
      textContent: email.text,
      type: 'transactional',
      priority: 'high',
      userId: event.userId ?? null,
      // Deterministic per event id: a redelivery hits the unique constraint
      // instead of sending the email twice. The resend variant has its own id.
      idempotencyKey: eventId ? idempotencyKeyFor(subject, eventId) : null,
      // Exempt from the optional email preferences (see isEmailChannelOpen).
      metadata: { essential: true },
    });
    // Identifiers only: never the address or the token.
    opts.logger.info('auth email queued', { subject, userId: event.userId });
  } catch (err) {
    const pgErr = err as { code?: string; constraint?: string };
    if (pgErr.code === '23505' && pgErr.constraint === 'email_queue_idempotency_key_unique') {
      return;
    }
    throw err;
  }
};

export const registerAuthEmailSubscribers = (
  opts: RegisterAuthEmailSubscribersOptions
): SubscriptionHandle[] => [
  subscribe<UserRegisteredEvent>(
    opts.nats,
    {
      subject: 'auth.userRegistered',
      durable: durableFor('auth.userRegistered'),
      onError: opts.onError,
    },
    async (event, meta) => {
      if (!event.email || !event.verificationToken) {
        return;
      }
      if (isExpired(event.verificationExpiresAt, (opts.now ?? (() => new Date()))())) {
        return;
      }
      await enqueue(
        opts,
        'auth.userRegistered',
        meta.id,
        event,
        renderVerificationEmail(event, opts.config.frontendUrl)
      );
    }
  ),
  subscribe<PasswordResetRequestedEvent>(
    opts.nats,
    {
      subject: 'auth.passwordResetRequested',
      durable: durableFor('auth.passwordResetRequested'),
      onError: opts.onError,
    },
    async (event, meta) => {
      if (!event.email || !event.resetToken) {
        return;
      }
      if (isExpired(event.resetExpiresAt, (opts.now ?? (() => new Date()))())) {
        return;
      }
      await enqueue(
        opts,
        'auth.passwordResetRequested',
        meta.id,
        event,
        renderPasswordResetEmail(event, opts.config.frontendUrl)
      );
    }
  ),
  subscribe<RescueStaffInvitedEvent>(
    opts.nats,
    {
      subject: 'rescue.staffInvited',
      durable: durableFor('rescue.staffInvited'),
      onError: opts.onError,
    },
    async (event, meta) => {
      // No token: an event published before the token rode along has nothing
      // useful to send.
      if (!event.email || !event.token) {
        return;
      }
      if (isExpired(event.expiration, (opts.now ?? (() => new Date()))())) {
        return;
      }
      await enqueue(
        opts,
        'rescue.staffInvited',
        meta.id,
        // The invitee has no user id; the queue row is keyed on the event id.
        { email: event.email },
        renderStaffInvitationEmail(event, opts.config.rescueAppUrl)
      );
    }
  ),
];
