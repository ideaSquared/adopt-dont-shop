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
 * more roles, on one resource.
 *
 * Each role's lib.types default access map is unioned together, taking
 * the most permissive level per field per role — the same "union the
 * grants of every role the user holds" rule the gRPC principal loader
 * already applies to plain permissions (see auth's loadPrincipal).
 *
 * `overrides`, when supplied, is a pre-resolved field-access map (e.g.
 * from the `field_permissions` DB table) layered on top of the role
 * defaults with the same most-permissive-wins rule. No caller wires a
 * real override source yet — see the ADS-1037 rollout note in
 * docs/adr — this parameter is the integration point for when one does.
 *
 * The sensitive-field denylist is re-applied after merging so neither a
 * role default nor a supplied override can ever expose password/token/
 * secret fields.
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
    mergeInto(merged, overrides);
  }
  return enforceSensitiveDenylist(resource, merged);
}
