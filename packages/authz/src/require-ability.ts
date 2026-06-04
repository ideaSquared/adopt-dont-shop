import { subject as caslSubject } from '@casl/ability';

import type { AbilityAction, AbilitySubject, AppAbility } from './abilities.js';

// Subject + optional scope conditions. When `conditions` is empty (or the
// caller passes a bare string), `requireAbility` falls back to CASL's
// bare-string semantics — see CAD lesson #10 below.
export type SubjectScope = {
  kind: Exclude<AbilitySubject, 'all'>;
} & Record<string, unknown>;

// requireAbility runs `ability.can(action, subject)` while handling CASL's
// bare-string-vs-tagged-instance quirk. The CAD repo wrote this up after
// PR #46 caused observer 403s on unscoped reads.
//
// CAD lesson #10, copied here verbatim because the trap is identical:
//
//   ability.can('view', 'Incident')                  → TRUE
//     (any rule for this subject type passes;
//      conditions are ignored)
//
//   ability.can('view', subject('Incident', {}))     → FALSE
//     (CASL evaluates the rule's `{tier:'police'}` against
//      tier:undefined; condition match fails)
//
// The fix is: detect the no-conditions case and pass the bare string. With
// at least one condition present, use the tagged subject so condition rules
// can evaluate.
export function requireAbility(
  ability: AppAbility,
  action: AbilityAction,
  scope: SubjectScope | Exclude<AbilitySubject, 'all'>
): boolean {
  if (typeof scope === 'string') {
    return ability.can(action, scope);
  }
  const { kind, ...conditions } = scope;
  if (Object.keys(conditions).length === 0) {
    return ability.can(action, kind);
  }
  return ability.can(action, caslSubject(kind, conditions) as unknown as AbilitySubject);
}
