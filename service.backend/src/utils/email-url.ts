/**
 * Per-role / per-email-type link destination resolver.
 *
 * Background: notification emails previously linked to a single fixed
 * frontend (FRONTEND_URL). For multi-role users (an adopter who is also
 * verified rescue staff, or an admin who also adopts) that link drops
 * them in the wrong app — they have to manually navigate to the right
 * surface to complete the action.
 *
 * Strategy:
 *   1. Strongly-typed emails (rescue invitation, password reset, etc.)
 *      pin the destination to a fixed app regardless of who the
 *      recipient is. This is the dominant case and the safest mapping:
 *      a rescue invitation is meaningless outside the rescue app.
 *   2. Untyped / role-driven emails (legal re-acceptance, generic
 *      notifications) use the recipient's primary role to pick the app.
 *   3. Missing primary role falls back to the client app — the safe
 *      default, since every account can use the adopter surface.
 *
 * The returned origin is the same value `getValidatedFrontendOrigin`
 * would return (validated against the allowlist, scheme-checked for
 * production) — this helper picks WHICH origin to validate, not how.
 */
import { UserType } from '../models/User';
import { assertAllowedFrontendUrl } from './url-allowlist';

/**
 * Known typed-email contexts. Add a new value here when a new email
 * has a fixed-app destination; the compiler will then force the
 * mapping table below to be updated.
 */
export enum EmailLinkType {
  // Adopter-facing (client app)
  PASSWORD_RESET = 'password_reset',
  EMAIL_VERIFICATION = 'email_verification',
  TWO_FACTOR_RECOVERY = 'two_factor_recovery',
  ACCOUNT_EXISTS = 'account_exists',
  APPLICATION_STATUS_CHANGE = 'application_status_change',

  // Rescue-facing (rescue app)
  RESCUE_INVITATION = 'rescue_invitation',
  RESCUE_VERIFICATION = 'rescue_verification',

  // Role-driven (no fixed app — resolve via recipient role)
  MODERATION_OUTCOME = 'moderation_outcome',
  LEGAL_REACCEPTANCE = 'legal_reacceptance',
  GENERIC = 'generic',
}

const DEFAULT_CLIENT_URL = 'http://localhost:3000';
const DEFAULT_RESCUE_URL = 'http://localhost:3002';
const DEFAULT_ADMIN_URL = 'http://localhost:3001';

const isProduction = (): boolean => process.env.NODE_ENV === 'production';

const readClientUrl = (): string => {
  const raw = process.env.FRONTEND_URL;
  if (!raw) {
    if (isProduction()) {
      throw new Error('FRONTEND_URL is not set in production');
    }
    return DEFAULT_CLIENT_URL;
  }
  return assertAllowedFrontendUrl(raw).replace(/\/$/, '');
};

const readRescueUrl = (): string => {
  const raw = process.env.RESCUE_FRONTEND_URL;
  if (!raw) {
    if (isProduction()) {
      throw new Error('RESCUE_FRONTEND_URL is not set in production');
    }
    return DEFAULT_RESCUE_URL;
  }
  return assertAllowedFrontendUrl(raw).replace(/\/$/, '');
};

const readAdminUrl = (): string => {
  // ADMIN_FRONTEND_URL is optional even in production — admin-only emails
  // are rare, and falling back to the client URL keeps links functional
  // (the admin can navigate from there) rather than throwing.
  const raw = process.env.ADMIN_FRONTEND_URL;
  if (!raw) {
    if (isProduction()) {
      return readClientUrl();
    }
    return DEFAULT_ADMIN_URL;
  }
  return assertAllowedFrontendUrl(raw).replace(/\/$/, '');
};

/**
 * Maps a recipient's primary role to the app they primarily live in.
 * Used as a fallback when the email type doesn't pin a destination.
 */
const primaryRoleToApp = (role: UserType | undefined): 'client' | 'rescue' | 'admin' => {
  switch (role) {
    case UserType.RESCUE_STAFF:
      return 'rescue';
    case UserType.ADMIN:
    case UserType.SUPER_ADMIN:
    case UserType.MODERATOR:
    case UserType.SUPPORT_AGENT:
      return 'admin';
    case UserType.ADOPTER:
    default:
      // Safe default: every account can use the adopter surface, so
      // a missing/unknown primaryRole lands in the client app.
      return 'client';
  }
};

/**
 * Maps a typed email to its fixed destination app. Returns `null` for
 * email types that defer to the recipient's primary role.
 */
const emailTypeToApp = (type: EmailLinkType): 'client' | 'rescue' | 'admin' | null => {
  switch (type) {
    case EmailLinkType.PASSWORD_RESET:
    case EmailLinkType.EMAIL_VERIFICATION:
    case EmailLinkType.TWO_FACTOR_RECOVERY:
    case EmailLinkType.ACCOUNT_EXISTS:
    case EmailLinkType.APPLICATION_STATUS_CHANGE:
      return 'client';
    case EmailLinkType.RESCUE_INVITATION:
    case EmailLinkType.RESCUE_VERIFICATION:
      return 'rescue';
    case EmailLinkType.MODERATION_OUTCOME:
    case EmailLinkType.LEGAL_REACCEPTANCE:
    case EmailLinkType.GENERIC:
      return null;
  }
};

const readAppOrigin = (app: 'client' | 'rescue' | 'admin'): string => {
  switch (app) {
    case 'client':
      return readClientUrl();
    case 'rescue':
      return readRescueUrl();
    case 'admin':
      return readAdminUrl();
  }
};

/**
 * Resolve the validated origin (no trailing slash) to use as the link
 * base for an email. Pass the recipient's `userType` so role-driven
 * emails can route correctly; omit it for emails sent to addresses
 * with no associated account.
 *
 * Typed emails (rescue invitation, password reset, etc.) always go to
 * their fixed app and ignore `recipientPrimaryRole`. Role-driven types
 * (legal reminders, moderation outcomes, generic notifications) use
 * the primary role; absent role → client app.
 */
export const resolveEmailLinkBase = (
  emailType: EmailLinkType,
  recipientPrimaryRole?: UserType
): string => {
  const typedApp = emailTypeToApp(emailType);
  const app = typedApp ?? primaryRoleToApp(recipientPrimaryRole);
  return readAppOrigin(app);
};
