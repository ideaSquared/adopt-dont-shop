import type { Model } from 'sequelize';
import type { JsonObject, JsonValue } from '../types/common';

/**
 * Capture before/after values for the subset of fields that actually changed
 * on a Sequelize model instance. Used by services to enrich audit_logs rows
 * with field-level deltas on UPDATE operations.
 *
 * Call BEFORE `await instance.save()` (or pass the still-dirty instance from
 * `instance.set(payload)`). Sequelize keeps `_previousDataValues` populated
 * until save commits, after which `changed()` returns false and the diff
 * cannot be reconstructed.
 *
 * Usage:
 *   user.set(payload);
 *   const diff = diffSequelize(user, ['email', 'phone', 'status']);
 *   await user.save({ transaction: t });
 *   await AuditLogService.log({
 *     action: 'USER_UPDATED',
 *     entity: 'User',
 *     entityId: user.userId,
 *     details: { diff },
 *     transaction: t,
 *   });
 *
 * Restricting to an allowlist keeps audit rows compact and prevents accidental
 * leaks of bulky / sensitive fields that weren't intended to be tracked.
 */

type AnyModel = Model<Record<string, unknown>>;

const toJsonSafe = (value: unknown): JsonValue => {
  if (value === null || value === undefined) {
    return null;
  }
  if (value instanceof Date) {
    return value.toISOString();
  }
  if (['string', 'number', 'boolean'].includes(typeof value)) {
    return value as JsonValue;
  }
  try {
    return JSON.parse(JSON.stringify(value)) as JsonValue;
  } catch {
    return String(value);
  }
};

export const diffSequelize = <T extends AnyModel>(
  instance: T,
  allowlist: ReadonlyArray<string>
): JsonObject | null => {
  if (!instance || typeof instance.changed !== 'function') {
    return null;
  }
  const changed = instance.changed();
  if (changed === false || (Array.isArray(changed) && changed.length === 0)) {
    return null;
  }
  const changedFields = Array.isArray(changed) ? changed : [];
  const allowed = new Set(allowlist);
  const diff: JsonObject = {};
  for (const field of changedFields) {
    if (!allowed.has(field)) {
      continue;
    }
    const previous = (instance as unknown as { _previousDataValues: Record<string, unknown> })
      ._previousDataValues?.[field];
    const next = (instance as unknown as { dataValues: Record<string, unknown> }).dataValues?.[
      field
    ];
    diff[field] = {
      before: toJsonSafe(previous),
      after: toJsonSafe(next),
    } as JsonValue;
  }
  return Object.keys(diff).length > 0 ? diff : null;
};
