# @adopt-dont-shop/authz

CASL ability model for backend microservices. Ported from CAD's
`@cad/lib.authz` with adopt-dont-shop's role + rescue-scope model.

## What's here

- **`defineAbilitiesFor(principal)`** — returns a CASL `MongoAbility`
  matching the user's role + scope. The same definitions are used at the
  gateway edge and at each receiving service (CAD's defence-in-depth
  re-check pattern — gateway decision + per-service decision can never
  disagree because both build the ability from the same `(userType,
  rescueId)` payload).
- **`requireAbility(ability, action, scope)`** — wraps `ability.can(...)`
  with the **CAD lesson #10** fix for CASL's bare-string-vs-tagged-subject
  quirk:

  ```ts
  ability.can('read', 'Pet')                  // → TRUE  (any rule for type passes)
  ability.can('read', subject('Pet', {}))     // → FALSE (empty conditions fail
                                              //         a `{rescueId: '...'}` rule)
  ```

  The helper detects the empty-conditions case and passes the bare string;
  with at least one condition, it tags the subject so condition rules can
  evaluate. Without this, unscoped reads 403 for users whose rules require
  a scope match.

## Role model

Adapted from adopt-dont-shop's existing `UserRole`:

| Role           | Scope            | Headline rule                                            |
|----------------|------------------|----------------------------------------------------------|
| `super_admin`  | platform-wide    | `manage all`                                             |
| `admin`        | rescueId         | `manage` Pet / Application / StaffMember / Rescue / Invitation within own rescue |
| `rescue_staff` | rescueId         | CRUD + review/approve/reject Application within own rescue; no staff management |
| `moderator`    | platform-wide    | review/moderate Report, moderate Message, suspend User    |
| `support_agent`| platform-wide    | read/update SupportTicket, read-only on User / Application |
| `adopter`      | self (userId)    | create + read own Application; read/send Message on own Chat; read public Pet listings |

The `rescueId` scope on `admin` + `rescue_staff` mirrors CAD's `tier`
scope on `dispatcher` / `supervisor` — same multi-tenant shape, different
domain word.

## Usage

```ts
import { defineAbilitiesFor, requireAbility } from '@adopt-dont-shop/authz';

// Service receives `x-user-{id,type,rescue-id}` gRPC metadata and rebuilds:
const ability = defineAbilitiesFor({
  userId: req.headers['x-user-id'],
  userType: req.headers['x-user-type'],
  rescueId: req.headers['x-rescue-id'] || undefined,
});

// Then gate every command:
if (!requireAbility(ability, 'approve', { kind: 'Application', rescueId: app.rescueId })) {
  throw new ForbiddenError('not allowed to approve this application');
}
```

## What's NOT here yet

- **Persistence of the rule list across the wire.** CAD ships `ability_json`
  in `LoginResponse` so the SPA can build the same ability the gateway
  uses. We'll add that when `service.auth` extracts; until then each side
  builds its own from the same `(userType, rescueId)` shape.
- **Field-level permissions.** `lib.permissions` already covers field
  masking via a separate system; authz is action+subject only.
