---
name: permissions-frontend
description: >
  How to gate UI by user role, permission, or field-level access in React apps.
  Apply when conditionally rendering admin-only controls, role-gated routes,
  rescue staff features, or fields hidden by the field-permissions system.
---

# Frontend Permissions

The frontend has three permission layers, each with a clear job:

| Layer | Purpose | Source |
|-------|---------|--------|
| **Role gates** | Coarse: is this user an admin / rescue staff / adopter? | `useAuth()` → `user.userType` |
| **Permission gates** | Fine: does this user have permission X? | `lib.permissions` `PermissionsService` |
| **Field gates** | Per-field read/write access by role + resource | `lib.permissions` `FieldPermissionsService` (see `field-permissions` skill) |

**Critical rule:** frontend permission checks are UX, not security. The backend
enforces every permission on every request. Never use a frontend check as the
only barrier to a sensitive action.

## Role gates (the simplest case)

```typescript
import { useAuth } from '@adopt-dont-shop/lib.auth';

const Settings = () => {
  const { user } = useAuth();

  if (user?.userType !== 'admin') {
    return <Unauthorized />;
  }

  return <AdminSettings />;
};
```

For route-level role guards, use the route wrapper (e.g.
`<ProtectedRoute roles={['admin']}>`) defined in each app's router config rather
than inlining the check on every page.

## Permission gates

`lib.permissions` exports `PermissionsService` with check helpers. The user's
permission set is loaded once on auth and cached. Use it from a hook:

```typescript
import { useAuth } from '@adopt-dont-shop/lib.auth';
import { PermissionsService } from '@adopt-dont-shop/lib.permissions';

const usePermission = (permission: string) => {
  const { user } = useAuth();
  if (!user) return false;
  return PermissionsService.userHasPermission(user, permission);
};

// In a component
const canSuspend = usePermission('user.suspend');

{canSuspend && <SuspendButton userId={userId} />}
```

Use constants for permission strings, not inline literals — `lib.permissions`
exports `PERMISSIONS.USER_SUSPEND` etc. so typos don't slip through.

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

## Combining gates

Order from cheapest to most expensive:

```typescript
if (!isAuthenticated) return <SignIn />;
if (user.userType !== 'admin') return <Unauthorized />;
if (!usePermission('reports.export')) return <Unauthorized />;
// ... render the admin reports page
```

Don't chain unrelated checks — if a check returns false, render the appropriate
state and stop. Don't blank-screen because two flags don't align.

## Gating actions, not just views

Hide controls the user can't invoke. If a user lacks `pet.delete`, don't render
the delete button. Disabled-but-visible is acceptable when:
- The button is part of a primary toolbar that would feel broken if missing
- The disabled state communicates *why* via tooltip / aria-describedby

```typescript
{canDelete ? (
  <DangerButton onClick={onDelete}>Delete</DangerButton>
) : (
  <DangerButton disabled aria-describedby="delete-disabled-reason">Delete</DangerButton>
)}
<span id="delete-disabled-reason" className="sr-only">
  You don't have permission to delete pets.
</span>
```

Most of the time, just hide.

## Empty states for restricted users

If a whole page or section has zero permitted content, show an explanation, not
a blank screen:

```typescript
const { data: pets } = usePets();
const visiblePets = pets?.data.filter(p => canRead(p)) ?? [];

if (visiblePets.length === 0) {
  return <EmptyState title="No pets" message="You don't have access to any pets in this rescue." />;
}
```

## Always assume the backend will reject

Frontend gates are UX hints. The backend re-checks:

- Auth on every request (`authenticateToken`)
- RBAC on every route (`requirePermission`)
- Field-level read masking (`fieldMask`) and write rejection (`fieldWriteGuard`)

So a malicious user bypassing the frontend can't escalate. **Your job is making
the UI not show them buttons that would 403.**

## Testing permission gates

In Vitest tests, mock `useAuth` to drive different roles:

```typescript
vi.mock('@adopt-dont-shop/lib.auth', () => ({
  useAuth: () => ({
    user: { userId: 'u1', userType: 'admin' },
    isAuthenticated: true,
  }),
}));
```

Test the matrix that matters: admin sees the control, adopter doesn't. Don't
write 10 permutations — one positive and one negative per gate is enough.

For field permissions, `lib.permissions/src/test-utils/` provides helpers for
building synthetic access maps in tests.

## Common mistakes

- Treating frontend gates as security — they're UX. Backend is the gate.
- Hardcoding role strings (`'admin'`) instead of using `UserType.ADMIN` exports
- Re-computing the field access map on every render → 60s cache helps but still
  unnecessary work. Lift it to the top of the component
- Showing a disabled "Delete" button to a user who can't see deletion exists at
  all — that's noise, just hide
- Forgetting that field access `none` means the value is also stripped on the
  wire → don't try to fall back to it
- Inconsistent gates between list view and detail view — user sees the row but
  can't open it. Decide once and apply everywhere.
- Adding new permission strings without checking `PERMISSIONS.*` constants
