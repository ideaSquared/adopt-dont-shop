import {
  enforceSensitiveDenylist,
  getFieldAccessMap,
  type FieldAccessLevel,
  type FieldPermissionResource,
  type UserRole,
} from '@adopt-dont-shop/lib.types';

// A field name -> access level map, resolved for a specific principal.
// Re-exported here (rather than importing lib.types' FieldAccessMap
// directly at every call site) so services that only need field-access
// enforcement can depend on @adopt-dont-shop/authz alone.
export type FieldAccessMap = Record<string, FieldAccessLevel>;

const LEVEL_RANK: Record<FieldAccessLevel, number> = { none: 0, read: 1, write: 2 };

function mostPermissive(a: FieldAccessLevel, b: FieldAccessLevel): FieldAccessLevel {
  return LEVEL_RANK[a] >= LEVEL_RANK[b] ? a : b;
}

function mergeInto(target: FieldAccessMap, source: FieldAccessMap): void {
  for (const [field, level] of Object.entries(source)) {
    const current = target[field];
    target[field] = current === undefined ? level : mostPermissive(current, level);
  }
}

/**
 * Resolve the effective field-access map for a principal holding one or
 * more roles, on one resource. Three stages, in order:
 *
 * 1. Role defaults union: each role's lib.types default access map is
 *    merged together, taking the most permissive level per field per
 *    role — the same "union the grants of every role the user holds"
 *    rule the gRPC principal loader already applies to plain permissions
 *    (see auth's loadPrincipal). A multi-role user's baseline is never
 *    more restrictive than any one of their roles alone.
 *
 * 2. Admin overrides take precedence: `overrides`, when supplied, is a
 *    pre-resolved field-access map (e.g. from the `field_permissions` DB
 *    table an admin edits via the Field Permissions UI) applied ON TOP
 *    of the unioned role defaults. Unlike the role union, an override
 *    REPLACES the field's level rather than taking the more permissive
 *    of the two — it can both loosen AND RESTRICT a field the role
 *    default would otherwise grant (e.g. default 'write' + override
 *    'none' → 'none'). Most-permissive-wins is the right rule for
 *    unioning a principal's own roles; it is the WRONG rule for an
 *    admin-configured override, whose entire purpose is to let an
 *    operator tighten access below what the role default grants — a
 *    union there would make the admin UI unable to ever restrict
 *    anything, silently reintroducing the phantom-control gap ADS-1037
 *    exists to close. No caller wires a real override source yet — see
 *    the ADS-1037 rollout note in docs/adr — this parameter is the
 *    integration point for when one does.
 *
 * 3. Sensitive-field denylist wins last: re-applied after the override
 *    layer so neither a role default nor a supplied override can ever
 *    expose password/token/secret fields, regardless of what either one
 *    says.
 */
export function resolveFieldAccessMap(
  resource: FieldPermissionResource,
  roles: readonly UserRole[],
  overrides?: FieldAccessMap
): FieldAccessMap {
  const merged: FieldAccessMap = {};
  for (const role of roles) {
    mergeInto(merged, getFieldAccessMap(resource, role));
  }
  if (overrides) {
    Object.assign(merged, overrides);
  }
  return enforceSensitiveDenylist(resource, merged);
}
