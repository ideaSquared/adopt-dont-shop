import { describe, expect, it } from 'vitest';

import type { FieldSchema, ProtoSchema, Sensitivity } from '@adopt-dont-shop/proto';

import { findApplicableUnlock, maskMessageJson, maskOrReveal } from './masking.js';

const field = (over: Partial<FieldSchema> & Pick<FieldSchema, 'name' | 'kind'>): FieldSchema => ({
  jsonName: over.name,
  repeated: false,
  optional: false,
  sensitivity: null,
  ...over,
});
const scalar = (
  name: string,
  scalarType: FieldSchema['scalarType'],
  sensitivity: Sensitivity | null = null,
  repeated = false
) => field({ name, kind: 'scalar', scalarType, sensitivity, repeated });

const SCHEMA: ProtoSchema = {
  enums: { 'p.Color': { fullName: 'p.Color', values: [{ name: 'RED', number: 0 }] } },
  services: {},
  messages: {
    'p.Root': {
      fullName: 'p.Root',
      fields: [
        scalar('publicStr', 'string', 'PUBLIC'),
        scalar('internalStr', 'string', 'INTERNAL'),
        scalar('piiStr', 'string', 'PII'),
        scalar('specialNum', 'int32', 'SPECIAL'),
        scalar('plainStr', 'string'),
        scalar('plainBytes', 'bytes'),
        scalar('plainBool', 'bool'),
        scalar('plainInt', 'int64'),
        scalar('plainDouble', 'double'),
        scalar('tags', 'string', null, true),
        scalar('counts', 'int32', null, true),
        field({ name: 'color', kind: 'enum', typeName: 'p.Color' }),
        field({ name: 'labels', kind: 'map', typeName: 'p.Child' }),
        field({ name: 'child', kind: 'message', typeName: 'p.Child' }),
        field({ name: 'secretChild', kind: 'message', typeName: 'p.Child', sensitivity: 'PII' }),
        field({ name: 'publicChild', kind: 'message', typeName: 'p.Child', sensitivity: 'PUBLIC' }),
        field({ name: 'items', kind: 'message', typeName: 'p.Child', repeated: true }),
        field({ name: 'ghost', kind: 'message', typeName: 'p.Missing' }),
        field({
          name: 'snake_case_name',
          jsonName: 'snakeCaseName',
          kind: 'scalar',
          scalarType: 'string',
          sensitivity: 'PUBLIC',
        }),
      ],
    },
    'p.Child': {
      fullName: 'p.Child',
      fields: [
        scalar('email', 'string', 'PII'),
        scalar('age', 'int32'),
        field({ name: 'inner', kind: 'message', typeName: 'p.Child' }),
      ],
    },
  },
};

const mask = (json: unknown) => maskMessageJson(SCHEMA, 'p.Root', json);
const HIDDEN = { $hidden: true };

describe('masking rule table', () => {
  it.each([
    ['annotated PUBLIC string', { publicStr: 'x' }, 'x', []],
    ['annotated INTERNAL string', { internalStr: 'x' }, 'x', []],
    ['annotated PII string', { piiStr: 'x' }, HIDDEN, ['piiStr']],
    ['annotated SPECIAL number', { specialNum: 4 }, HIDDEN, ['specialNum']],
    ['unannotated string', { plainStr: 'x' }, HIDDEN, ['plainStr']],
    ['unannotated bytes', { plainBytes: 'AAAA' }, HIDDEN, ['plainBytes']],
    ['unannotated bool', { plainBool: true }, true, []],
    ['unannotated int64 (string form)', { plainInt: '123' }, '123', []],
    ['unannotated double', { plainDouble: 1.5 }, 1.5, []],
    ['unannotated repeated strings hide as a whole', { tags: ['a', 'b'] }, HIDDEN, ['tags']],
    ['unannotated repeated numbers', { counts: [1, 2] }, [1, 2], []],
    ['enum', { color: 'RED' }, 'RED', []],
    ['map hides as a whole', { labels: { a: { age: 1 } } }, HIDDEN, ['labels']],
    ['PII message hides as a whole', { secretChild: { age: 1 } }, HIDDEN, ['secretChild']],
    ['null is visible', { plainStr: null }, null, []],
  ])('%s', (_name, input, expectedValue, expectedHidden) => {
    const result = mask(input);
    expect(Object.values(result.value as object)[0]).toEqual(expectedValue);
    expect(result.hidden).toEqual(expectedHidden);
  });

  it('recurses into messages and repeated messages with dotted/indexed paths', () => {
    const result = mask({
      child: { email: 'e', age: 3, inner: { email: 'e2', age: 4 } },
      items: [{ email: 'a', age: 1 }, { age: 2 }, { email: 'c' }],
    });
    expect(result.value).toEqual({
      child: { email: HIDDEN, age: 3, inner: { email: HIDDEN, age: 4 } },
      items: [{ email: HIDDEN, age: 1 }, { age: 2 }, { email: HIDDEN }],
    });
    expect(result.hidden).toEqual([
      'child.email',
      'child.inner.email',
      'items[0].email',
      'items[2].email',
    ]);
  });

  it('still masks PII nested inside a message field annotated PUBLIC', () => {
    const result = mask({ publicChild: { email: 'e', age: 3 } });
    expect(result.value).toEqual({ publicChild: { email: HIDDEN, age: 3 } });
    expect(result.hidden).toEqual(['publicChild.email']);
  });

  it('hides unknown keys, messages missing from the schema, and shape mismatches', () => {
    expect(mask({ surprise: 'x' }).hidden).toEqual(['surprise']);
    expect(mask({ ghost: { a: 1 } }).hidden).toEqual(['ghost']);
    expect(mask({ child: 'not-an-object' }).hidden).toEqual(['child']);
    expect(mask({ items: { not: 'array' } }).hidden).toEqual(['items']);
    expect(mask({ plainInt: { nested: 1 } }).hidden).toEqual(['plainInt']);
    expect(mask({ color: ['RED', { x: 1 }] }).hidden).toEqual(['color']);
    expect(maskMessageJson(SCHEMA, 'p.Nope', {}).hidden).toEqual(['(root)']);
    expect(mask('nope').hidden).toEqual(['(root)']);
  });

  it('matches fields by proto name as well as json name', () => {
    expect(mask({ snake_case_name: 'x' }).hidden).toEqual([]);
    expect(mask({ snakeCaseName: 'x' }).hidden).toEqual([]);
  });
});

describe('unlocks', () => {
  const user = { unlockId: 'u1', subjectType: 'user' as const, subjectId: 'U1' };
  const any = { unlockId: 'a1', subjectType: 'any' as const, subjectId: null };

  it('matches any-unlocks always and scoped unlocks only for their subject', () => {
    expect(findApplicableUnlock([user], { subjectType: 'user', subjectId: 'U1' })).toBe(user);
    expect(findApplicableUnlock([user], { subjectType: 'user', subjectId: 'U2' })).toBeUndefined();
    expect(
      findApplicableUnlock([user], { subjectType: 'rescue', subjectId: 'U1' })
    ).toBeUndefined();
    expect(findApplicableUnlock([user], null)).toBeUndefined();
    expect(findApplicableUnlock([user, any], null)).toBe(any);
  });

  const json = { piiStr: 'secret', plainInt: 1 };
  const params = { schema: SCHEMA, messageName: 'p.Root', json };

  it('masks and names the unlock that would reveal', () => {
    const subject = { subjectType: 'user' as const, subjectId: 'U1' };
    expect(maskOrReveal({ ...params, subject, unlock: undefined })).toMatchObject({
      response: { piiStr: HIDDEN, plainInt: 1 },
      hidden: ['piiStr'],
      unlockable: subject,
      revealedBy: null,
    });
    expect(maskOrReveal({ ...params, subject: null, unlock: undefined }).unlockable).toEqual({
      subjectType: 'any',
      subjectId: null,
    });
  });

  it('reveals everything under an unlock and returns the revealed paths', () => {
    expect(maskOrReveal({ ...params, subject: null, unlock: any })).toEqual({
      response: json,
      hidden: [],
      unlockable: null,
      revealedBy: 'a1',
      revealedFields: ['piiStr'],
    });
  });

  it('reports nothing to unlock when nothing is hidden', () => {
    expect(
      maskOrReveal({ ...params, json: { plainInt: 1 }, subject: null, unlock: any })
    ).toMatchObject({
      hidden: [],
      unlockable: null,
      revealedBy: null,
    });
  });
});
