import { AbilityBuilder, createMongoAbility, type MongoAbility } from '@casl/ability';

import type { RescueId, UserId, UserRole } from '@adopt-dont-shop/lib.types';

// CASL subject names — these correspond to the entity types each service
// owns. They're strings, not classes (we don't ship runtime class shapes
// to keep the ability serialisable across the wire). Each extracted service
// adds rules for its own subjects; consumers (gateway + receiving services)
// rebuild the ability from the same `(userType, scope)` payload so the two
// always agree (CAD's gateway-edge + per-service-re-check pattern).
export type AbilitySubject =
  | 'User'
  | 'Pet'
  | 'Application'
  | 'Rescue'
  | 'StaffMember'
  | 'Invitation'
  | 'Chat'
  | 'Message'
  | 'Notification'
  | 'Audit'
  | 'Report'
  | 'SupportTicket'
  | 'Rating'
  | 'all';

// Action vocabulary. Mirrors lib.types `PermissionAction` plus `manage`
// (CASL convention for "any action"). New actions are added here first and
// then to lib.types — the two must stay in sync.
export type AbilityAction =
  | 'create'
  | 'read'
  | 'update'
  | 'delete'
  | 'list'
  | 'archive'
  | 'feature'
  | 'publish'
  | 'approve'
  | 'reject'
  | 'review'
  | 'verify'
  | 'suspend'
  | 'moderate'
  | 'manage';

export type AppAbility = MongoAbility<[AbilityAction, AbilitySubject]>;

// Principal carries the minimum identity payload needed to derive an ability.
// Services receive this via gRPC metadata (`x-user-id`, `x-user-type`,
// `x-rescue-id`) and rebuild the ability locally — the same shape the
// gateway used at the edge, so the two ability instances are identical.
export type Principal = {
  userId: UserId;
  userType: UserRole;
  // Present for `rescue_staff` and rescue-scoped `admin` roles. Drives the
  // tenant-scoping rules below. Absent for adopter, super_admin, moderator,
  // support_agent.
  rescueId?: RescueId;
};

// defineAbilitiesFor returns a CASL ability matching the principal's role +
// scope. The rules below are authoritative; per-service `ability.can(...)`
// re-checks use the same definitions so deny/allow decisions match the
// edge gate (CAD's defence-in-depth pattern).
export function defineAbilitiesFor(principal: Principal): AppAbility {
  const builder = new AbilityBuilder<AppAbility>(createMongoAbility);
  // CASL v7's `AbilityBuilder.can` infers conditions as `MongoQuery<never>`
  // when subjects are bare strings (it expects subject CLASSES to derive
  // field shapes from). Runtime conditions work fine — CASL just compares
  // values — but the type guard rejects every `{ rescueId, adopterId, … }`
  // object literal. Wrap once here so the rules below stay readable; this
  // is the same approach the CAD repo uses against its own subject set.
  const can = builder.can.bind(builder) as (
    action: AbilityAction | AbilityAction[],
    subject: AbilitySubject,
    conditions?: Record<string, unknown>
  ) => void;
  const build = builder.build.bind(builder);

  // ------------------------------------------------------------------------
  // Public / common rules — apply to every authenticated user. Anonymous
  // users get a principal with `userType: 'adopter'` and an unauthenticated
  // marker upstream; rules below are still safe to grant since they only
  // permit reading public listings.
  // ------------------------------------------------------------------------
  can(['read', 'list'], 'Pet');
  can(['read', 'list'], 'Rescue');
  can('read', 'Rating');

  switch (principal.userType) {
    case 'super_admin':
      // Platform-wide superuser. `manage all` is CASL's wildcard.
      can('manage', 'all');
      break;

    case 'admin':
      // Rescue admin — full control of their own rescue's entities. The
      // `{ rescueId }` condition is what CAD-#10 tests force us to handle
      // carefully: a tagged subject with no `rescueId` field on it evaluates
      // FALSE against this rule. See requireAbility for the bare-string fix.
      if (principal.rescueId) {
        const rescueScope = { rescueId: principal.rescueId as string };
        can('manage', 'Pet', rescueScope);
        can('manage', 'Application', rescueScope);
        can('manage', 'StaffMember', rescueScope);
        can('manage', 'Rescue', rescueScope);
        can('manage', 'Invitation', rescueScope);
        can(['read', 'list'], 'Chat', rescueScope);
        can(['read', 'list'], 'Message', rescueScope);
      }
      break;

    case 'rescue_staff':
      // Day-to-day rescue operator — read + write own rescue's data, but not
      // staff management or rescue settings (admin owns those).
      if (principal.rescueId) {
        const rescueScope = { rescueId: principal.rescueId as string };
        can(['create', 'read', 'update', 'list', 'archive'], 'Pet', rescueScope);
        can(['read', 'list', 'review', 'approve', 'reject'], 'Application', rescueScope);
        can(['read', 'list'], 'StaffMember', rescueScope);
        can(['read', 'list', 'create', 'update'], 'Chat', rescueScope);
        can(['read', 'list', 'create'], 'Message', rescueScope);
      }
      break;

    case 'moderator':
      // Cross-rescue content moderation. No data-mutation outside moderation
      // surfaces — sanctions live on the User aggregate but only via the
      // `suspend` verb, not generic `update`.
      can(['read', 'list', 'review', 'moderate'], 'Report');
      can(['read', 'list', 'moderate'], 'Message');
      can('suspend', 'User');
      can(['read', 'list'], 'User');
      can(['read', 'list'], 'Pet');
      break;

    case 'support_agent':
      // Read-mostly + ticket-handling. No moderation surface, no rescue
      // operations.
      can(['read', 'list', 'update'], 'SupportTicket');
      can(['read', 'list'], 'User');
      can(['read', 'list'], 'Application');
      can(['read', 'list'], 'Chat');
      can(['read', 'list'], 'Message');
      break;

    case 'adopter':
      // The default. Public listings already granted above. Adopter can:
      //  - apply to adopt (create Application referencing self)
      //  - read OWN applications
      //  - read OWN chats + send messages on chats they participate in
      //  - read OWN notifications
      {
        const selfId = principal.userId as string;
        can('create', 'Application', { adopterId: selfId });
        can(['read', 'list'], 'Application', { adopterId: selfId });
        can(['read', 'list'], 'Chat', { adopterId: selfId });
        can(['create', 'read', 'list'], 'Message', { adopterId: selfId });
        can(['read', 'list', 'update'], 'Notification', { userId: selfId });
        can(['read', 'update'], 'User', { userId: selfId });
        can(['create', 'read'], 'Rating');
        can(['create', 'read'], 'Report');
        can('create', 'SupportTicket', { userId: selfId });
        can(['read', 'list'], 'SupportTicket', { userId: selfId });
      }
      break;
  }

  return build();
}
