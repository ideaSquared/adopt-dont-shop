---
name: permissions-frontend
description: >
  How to gate UI by permission or field-level access in React apps using
  PermissionGate, useHasPermission, and FieldPermissionsService. Apply when
  conditionally rendering staff/admin controls, route-level capability gates,
  or fields hidden by the field-permissions system.
---

# Frontend Permissions

The frontend has two permission layers, each with a clear job:

| Layer | Purpose | API |
|-------|---------|-----|
| **Permission gates** | "Can this user perform action X?" | `lib.auth` `<PermissionGate>` / `useHasPermission` |
| **Field gates** | Per-field read/write access by role + resource | `lib.permissions` `FieldPermissionsService` (see `field-permissions` skill) |

**Critical rule:** frontend permission checks are UX, not security. The backend
enforces every permission on every request. Never use a frontend check as the
only barrier to a sensitive action — your job is making the UI not show buttons
that would 403.

## Permissions, not roles

This codebase gates UI by **permission**, not by role. Roles (`admin`,
`rescue_staff`, `rescue_volunteer`, etc.) are bundles of permissions; the
backend seeder maps each role to its permission set, and the frontend reads
the resolved permissions for the signed-in user.

**Do not write `user.userType === 'admin'` or `user.role === 'rescue_admin'`
to gate functionality.** If a feature is admin-only, gate it by the
permission an admin would use to invoke it — e.g.
`'admin.config.update'` or `'notifications.broadcast'`.

The one exception is **identity** checks that aren't about capability — e.g.
`<ProtectedRoute>` in `app.admin` checks that the signed-in user's
`userType` is in `ADMIN_USER_TYPES` to gate the admin app shell. That's
"who you are" (you signed in via the admin app), not "what you can do".
Don't reach for this pattern in feature code; it's specifically for app-shell
guards.

## Wiring the provider

Each app mounts a `PermissionsProvider` from `lib.auth`, injected with the
app's configured `PermissionsService` (which the lib reuses to fetch and
cache the user's permission set):

```typescript
// app.*/src/App.tsx
import { PermissionsProvider } from '@adopt-dont-shop/lib.auth';
import { permissionsService } from '@/services/libraryServices';

<PermissionsProvider service={permissionsService}>
  {/* … rest of the app */}
</PermissionsProvider>
```

The provider reads the signed-in user from `useAuth()` and fetches their
permissions from `/api/v1/users/:userId/permissions`. Results are cached for
5 minutes inside `PermissionsService`.

## The two primitives

### `<PermissionGate>` — for inline JSX gating

```typescript
import { PermissionGate } from '@adopt-dont-shop/lib.auth';
import { PETS_DELETE } from '@adopt-dont-shop/lib.permissions';

<PermissionGate permission={PETS_DELETE}>
  <DangerButton onClick={onDelete}>Delete</DangerButton>
</PermissionGate>
```

Pass a `fallback` to render something else when denied:

```typescript
<PermissionGate
  permission={PETS_DELETE}
  fallback={<DisabledButton aria-describedby="no-delete">Delete</DisabledButton>}
>
  <DangerButton onClick={onDelete}>Delete</DangerButton>
</PermissionGate>
```

For "any of" and "all of" semantics:

```typescript
<PermissionGate anyOf={[PETS_CREATE, PETS_UPDATE]}>…</PermissionGate>
<PermissionGate allOf={[PETS_UPDATE, PETS_PUBLISH]}>…</PermissionGate>
```

Exactly one of `permission`, `anyOf`, `allOf` may be passed — the types
enforce this.

### `useHasPermission` — for boolean checks

When you need the decision as a value (passed to a child as a prop, used in
a condition, or feeding `disabled`), use the hook. **ADS-757**: the hook
returns `{ allowed, isLoading, error }` — gate on `!isLoading` before
trusting `allowed`, otherwise the empty initial permission set will read as
"denied" during the post-login fetch and your gated UI will flash hidden /
flash an Access Denied screen:

```typescript
import { useHasPermission } from '@adopt-dont-shop/lib.auth';
import { RESCUE_SETTINGS_UPDATE } from '@adopt-dont-shop/lib.permissions';

const RescueSettings = () => {
  const { allowed: canEdit, isLoading } = useHasPermission(RESCUE_SETTINGS_UPDATE);

  if (isLoading) return <SettingsFormSkeleton />;
  if (!canEdit) return <AccessDenied />;
  return <SettingsForm />;
};
```

If you only need the boolean for UI toggling (no separate denied state), the
common pattern is `allowed && !isLoading`:

```typescript
const { allowed, isLoading } = useHasPermission(CHAT_UPDATE);
const canManage = allowed && !isLoading;
{canManage && <ManageButton />}
```

`error` is populated when the permission fetch rejects (ADS-755). Most
consumers can ignore it — `<PermissionGate>` renders nothing on error — but
top-level screens may want to render a retry CTA.

Variants:
- `useHasAnyPermission(permissions: Permission[])` — `allowed` is true if user has at least one
- `useHasAllPermissions(permissions: Permission[])` — `allowed` is true only if user has all

Both share the same return shape.

**Prefer `<PermissionGate>` for declarative inline gating** — it already
handles the loading and error states for you and renders nothing until the
fetch settles. Reach for the hook only when you need the boolean to drive
something other than direct conditional rendering.

## Choosing between the two

- **`<PermissionGate>`** when the check directly determines whether a JSX
  subtree renders. Reads declaratively, no intermediate variable.
- **`useHasPermission`** when the boolean flows into prop wiring, a
  conditional that controls more than rendering, or a derived computation.

Don't mix them for the same check — pick the one that fits the surface.

## Use the permission constants

`lib.permissions` exports symbolic constants for every permission used in
the apps:

```typescript
import { PETS_CREATE, STAFF_DELETE, CHAT_UPDATE } from '@adopt-dont-shop/lib.permissions';
```

Use these instead of string literals. Typos become compile-time errors and
the constants document which permissions actually exist in the system.

If a permission you need isn't exported as a constant, add it rather than
inlining a string — the `Permission` type in `lib.types` is the union of all
permissions the backend may grant, so widen it (and add the constant in
`lib.permissions`) to capture the intent.

## Route-level guards

In `app.admin`, `<ProtectedRoute>` accepts `requiredPermission` or `anyOf`:

```typescript
<Route
  path='/audit'
  element={
    <ProtectedRoute requiredPermission='admin.audit.read'>
      <Audit />
    </ProtectedRoute>
  }
/>

<Route
  path='/dashboard'
  element={
    // No requiredPermission → only the base "admin-tier user" identity
    // check applies. Use this when every signed-in admin should see it.
    <ProtectedRoute>
      <Dashboard />
    </ProtectedRoute>
  }
/>
```

`<ProtectedRoute>` no longer takes `requiredRole`/`allowedRoles`. If you
need to keep a route admin-and-up-only but allow moderators too, gate it
by a permission both admins and moderators hold.

## Field gates

Use `FieldPermissionsService` when rendering a form or a profile view that
exposes fields whose access depends on role. The service merges defaults +
DB overrides + the sensitive denylist (see `field-permissions` skill).

```typescript
import { FieldPermissionsService } from '@adopt-dont-shop/lib.permissions';

const PetForm = ({ pet }: { pet: Pet }) => {
  const { user } = useAuth();
  const access = FieldPermissionsService.getEffectiveAccessMap('pets', user!.userType);

  return (
    <form>
      {access.name === 'write' && <TextInput name="name" defaultValue={pet.name} />}
      {access.name === 'read' && <ReadOnlyField label="Name" value={pet.name} />}

      {access.medical_notes === 'write' && (
        <TextArea name="medical_notes" defaultValue={pet.medical_notes} />
      )}
      {/* access.medical_notes === 'none' → don't render at all */}
    </form>
  );
};
```

The service caches the access map for 60s. Don't recompute it inside a render
loop — pull it once at the top of the component.

## What the access levels mean

| Level | UI behaviour |
|-------|--------------|
| `write` | Render as an editable input |
| `read` | Render as read-only (label + value) |
| `none` | Don't render the field at all (not even disabled — hide entirely) |

`none` means the backend will strip the field from the response too (see the
`field-permissions` skill), so the value won't be present even if you tried to
render it.

## Gating actions, not just views

Hide controls the user can't invoke. If a user lacks `pet.delete`, don't render
the delete button. Disabled-but-visible is acceptable when:
- The button is part of a primary toolbar that would feel broken if missing
- The disabled state communicates *why* via tooltip / aria-describedby

```typescript
const { allowed: canDelete, isLoading } = useHasPermission(PETS_DELETE);

{canDelete && !isLoading ? (
  <DangerButton onClick={onDelete}>Delete</DangerButton>
) : (
  <DangerButton disabled aria-describedby="delete-disabled-reason">Delete</DangerButton>
)}
<span id="delete-disabled-reason" className="sr-only">
  You don't have permission to delete pets.
</span>
```

Most of the time, just hide — `<PermissionGate>` with no fallback renders
nothing on denial.

## Empty states for restricted users

If a whole page or section has zero permitted content, show an explanation,
not a blank screen:

```typescript
const { allowed: canRead, isLoading } = useHasPermission(PETS_READ);

if (isLoading) return <LoadingSkeleton />;
if (!canRead) {
  return <EmptyState title="No access" message="You don't have access to any pets in this rescue." />;
}
```

## Always assume the backend will reject

Frontend gates are UX hints. The backend re-checks:

- Auth on every request (`authenticateToken`)
- RBAC on every route (`requirePermission`)
- Field-level read masking (`fieldMask`) and write rejection (`fieldWriteGuard`)

So a malicious user bypassing the frontend can't escalate. **Your job is
making the UI not show them buttons that would 403.**

## Testing permission gates

In Vitest tests, mock `useHasPermission` (or `usePermissions`) from
`lib.auth` to drive different permission slices:

```typescript
// Boolean per-permission style: simplest when a component checks one or two.
const mockedUseHasPermission = vi.fn();
vi.mock('@adopt-dont-shop/lib.auth', async () => {
  const actual = await vi.importActual<typeof import('@adopt-dont-shop/lib.auth')>(
    '@adopt-dont-shop/lib.auth'
  );
  return {
    ...actual,
    useHasPermission: (permission: string) => mockedUseHasPermission(permission),
  };
});

// In tests — ADS-757: hook returns { allowed, isLoading, error }.
mockedUseHasPermission.mockImplementation((p) => ({
  allowed: p === 'pets.create',
  isLoading: false,
  error: null,
}));
```

For components that read the whole permission set (e.g. via `usePermissions()`
or `useHasAnyPermission`), mock the provider instead:

```typescript
vi.mock('@adopt-dont-shop/lib.auth', async () => {
  const actual = await vi.importActual<typeof import('@adopt-dont-shop/lib.auth')>(
    '@adopt-dont-shop/lib.auth'
  );
  return {
    ...actual,
    usePermissions: () => ({
      permissions: ['pets.read', 'pets.create'],
      isLoading: false,
      refresh: vi.fn(),
    }),
  };
});
```

Test the matrix that matters: granted sees the control, denied doesn't.
Don't write 10 permutations — one positive and one negative per gate is
enough.

For field permissions, `lib.permissions/src/test-utils/` provides helpers
for building synthetic access maps in tests.

## Common mistakes

- Treating frontend gates as security — they're UX. Backend is the gate.
- Hardcoding role strings (`'admin'`) or `user.userType === ...` checks
  instead of using `useHasPermission(...)` with a permission constant
- Inline permission strings (`useHasPermission('pets.create')`) instead of
  importing the constant from `lib.permissions` — typos become silent bugs
- Re-computing the field access map on every render → 60s cache helps but
  still unnecessary work. Lift it to the top of the component
- Showing a disabled "Delete" button to a user who can't see deletion exists
  at all — that's noise, just hide
- Forgetting that field access `none` means the value is also stripped on the
  wire → don't try to fall back to it
- Inconsistent gates between list view and detail view — user sees the row
  but can't open it. Decide once and apply everywhere
- Adding new permission strings without checking `lib.permissions` exports
  and the `Permission` type in `lib.types`
