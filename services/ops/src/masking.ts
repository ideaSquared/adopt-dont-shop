import type { FieldSchema, ProtoSchema } from '@adopt-dont-shop/proto';
import {
  HIDDEN_MARKER_KEY,
  type HiddenMarker,
  type Unlockable,
} from '@adopt-dont-shop/ops-contract';

// Fail-closed PII masking of ts-proto toJSON output, driven by the reflected
// proto schema. Visibility of a field when no unlock applies:
//
//   annotated PUBLIC / INTERNAL        visible (messages still recurse, so a
//                                      PII field nested inside stays hidden)
//   annotated PII / SPECIAL            hidden
//   unannotated string / bytes / map   hidden
//   unannotated bool / number / enum   visible
//   unannotated message                recurse (the container itself is visible)
//
// Anything the schema cannot explain is hidden: unknown keys, messages missing
// from the schema, values whose shape does not match the declared field.
// Hidden values become `{ "$hidden": true }`; their dotted paths are returned.

const HIDDEN: HiddenMarker = { [HIDDEN_MARKER_KEY]: true };

type Walk = { value: unknown; hidden: readonly string[] };

const hide = (path: string): Walk => ({ value: HIDDEN, hidden: [path] });
const visible = (value: unknown): Walk => ({ value, hidden: [] });

const joinPath = (parent: string, key: string): string =>
  parent === '' ? key : `${parent}.${key}`;

const isPlainObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const isPrimitive = (value: unknown): boolean =>
  typeof value === 'number' || typeof value === 'boolean' || typeof value === 'string';

const isPrimitiveOrPrimitives = (value: unknown): boolean =>
  Array.isArray(value) ? value.every(isPrimitive) : isPrimitive(value);

const HIDDEN_SCALARS: ReadonlySet<string> = new Set(['string', 'bytes']);

const combine = (entries: readonly { key: string; walk: Walk }[]): Walk => ({
  value: Object.fromEntries(entries.map(({ key, walk }) => [key, walk.value])),
  hidden: entries.flatMap(({ walk }) => walk.hidden),
});

const walkMessage = (schema: ProtoSchema, fullName: string, value: unknown, path: string): Walk => {
  const message = Object.hasOwn(schema.messages, fullName) ? schema.messages[fullName] : undefined;
  if (message === undefined || !isPlainObject(value)) {
    return hide(path);
  }
  return combine(
    Object.entries(value).map(([key, child]) => {
      const field = message.fields.find(f => f.jsonName === key || f.name === key);
      return { key, walk: walkField(schema, field, child, joinPath(path, key)) };
    })
  );
};

const walkMessageField = (
  schema: ProtoSchema,
  field: FieldSchema,
  value: unknown,
  path: string
): Walk => {
  const typeName = field.typeName;
  if (typeName === undefined) {
    return hide(path);
  }
  if (!field.repeated) {
    return walkMessage(schema, typeName, value, path);
  }
  if (!Array.isArray(value)) {
    return hide(path);
  }
  const items = value.map((item, index) =>
    walkMessage(schema, typeName, item, `${path}[${index}]`)
  );
  return { value: items.map(i => i.value), hidden: items.flatMap(i => i.hidden) };
};

const walkField = (
  schema: ProtoSchema,
  field: FieldSchema | undefined,
  value: unknown,
  path: string
): Walk => {
  if (field === undefined) {
    return hide(path);
  }
  if (value === null) {
    return visible(value);
  }
  if (field.sensitivity === 'PII' || field.sensitivity === 'SPECIAL') {
    return hide(path);
  }
  if (field.kind === 'message') {
    return walkMessageField(schema, field, value, path);
  }
  if (field.sensitivity === 'PUBLIC' || field.sensitivity === 'INTERNAL') {
    return visible(value);
  }

  switch (field.kind) {
    case 'map':
      return hide(path);
    case 'enum':
      return isPrimitiveOrPrimitives(value) ? visible(value) : hide(path);
    case 'scalar': {
      const scalar = field.scalarType;
      if (scalar === undefined || HIDDEN_SCALARS.has(scalar)) {
        return hide(path);
      }
      return isPrimitiveOrPrimitives(value) ? visible(value) : hide(path);
    }
  }
};

export type MaskResult = { value: unknown; hidden: readonly string[] };

// Mask a toJSON'd message of type `messageName` (fully-qualified).
export const maskMessageJson = (
  schema: ProtoSchema,
  messageName: string,
  json: unknown
): MaskResult => {
  const { value, hidden } = walkMessage(schema, messageName, json, '');
  // A root that cannot be walked hides under the empty path; name it.
  return { value, hidden: hidden.map(p => (p === '' ? '(root)' : p)) };
};

// ---------------------------------------------------------------------------
// Unlocks
// ---------------------------------------------------------------------------

export type UnlockScope = {
  unlockId: string;
  subjectType: Unlockable['subjectType'];
  subjectId: string | null;
};

export type RequestSubject = { subjectType: Unlockable['subjectType']; subjectId: string };

// An unlock applies when it is 'any', or it covers exactly the request's subject.
export const findApplicableUnlock = <T extends UnlockScope>(
  unlocks: readonly T[],
  subject: RequestSubject | null
): T | undefined =>
  unlocks.find(
    u =>
      u.subjectType === 'any' ||
      (subject !== null &&
        u.subjectType === subject.subjectType &&
        u.subjectId === subject.subjectId)
  );

export type MaskedResponse = {
  response: unknown;
  hidden: readonly string[];
  unlockable: Unlockable | null;
  revealedBy: string | null;
  revealedFields: readonly string[];
};

// Mask a response, or reveal it in full when an applicable unlock is present.
// `revealedFields` names (never values) what the unlock revealed.
export const maskOrReveal = (params: {
  schema: ProtoSchema;
  messageName: string;
  json: unknown;
  subject: RequestSubject | null;
  unlock: UnlockScope | undefined;
}): MaskedResponse => {
  const { value, hidden } = maskMessageJson(params.schema, params.messageName, params.json);
  if (hidden.length === 0) {
    return { response: value, hidden: [], unlockable: null, revealedBy: null, revealedFields: [] };
  }
  if (params.unlock !== undefined) {
    return {
      response: params.json,
      hidden: [],
      unlockable: null,
      revealedBy: params.unlock.unlockId,
      revealedFields: hidden,
    };
  }
  return {
    response: value,
    hidden,
    unlockable: params.subject ?? { subjectType: 'any', subjectId: null },
    revealedBy: null,
    revealedFields: [],
  };
};
