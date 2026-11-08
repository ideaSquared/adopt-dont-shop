import { cpSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { PROTO_SCHEMA } from './schema.generated.js';
import type { ProtoSchema } from './schema-types.js';

const PET = 'adopt_dont_shop.pets.v1';

const field = (schema: ProtoSchema, message: string, name: string) => {
  const found = schema.messages[message]?.fields.find(f => f.name === name);
  if (!found) throw new Error(`${message}.${name} not found`);
  return found;
};

describe('PROTO_SCHEMA (committed reflection of proto/)', () => {
  it('lists service methods with fully-qualified input and output types', () => {
    const service = PROTO_SCHEMA.services[`${PET}.PetService`];

    expect(service?.package).toBe(PET);
    expect(service?.name).toBe('PetService');
    expect(service?.methods.find(m => m.name === 'Get')).toMatchObject({
      name: 'Get',
      inputType: `${PET}.GetPetRequest`,
      outputType: `${PET}.GetPetResponse`,
    });
  });

  it('carries leading comments on methods', () => {
    const get = PROTO_SCHEMA.services[`${PET}.PetService`]?.methods.find(m => m.name === 'Get');

    expect(get?.comment).toContain('Fetch a single pet by id');
  });

  it('reports annotated sensitivity levels', () => {
    expect(field(PROTO_SCHEMA, `${PET}.GetPetRequest`, 'pet_id').sensitivity).toBe('INTERNAL');
    expect(field(PROTO_SCHEMA, `${PET}.Pet`, 'name').sensitivity).toBe('PUBLIC');
    expect(field(PROTO_SCHEMA, 'adopt_dont_shop.auth.v1.LoginRequest', 'email').sensitivity).toBe(
      'PII'
    );
    expect(
      field(PROTO_SCHEMA, 'adopt_dont_shop.auth.v1.LoginRequest', 'password').sensitivity
    ).toBe('SPECIAL');
  });

  it('reports null for an unannotated field', () => {
    expect(field(PROTO_SCHEMA, `${PET}.ListPetsRequest`, 'search').sensitivity).toBeNull();
  });

  it('never exposes a credential field below SPECIAL', () => {
    const credentialNames = /(^|_)(password|secret|token|backup_codes?)$/;
    const weak = Object.values(PROTO_SCHEMA.messages).flatMap(message =>
      message.fields
        .filter(f => credentialNames.test(f.name) && f.scalarType !== undefined)
        .filter(f => f.sensitivity === 'PUBLIC' || f.sensitivity === 'INTERNAL')
        .map(f => `${message.fullName}.${f.name}`)
    );

    expect(weak).toEqual([]);
  });

  it('uses camelCase json names as ts-proto does', () => {
    const f = field(PROTO_SCHEMA, `${PET}.GetPetRequest`, 'pet_id');

    expect(f.jsonName).toBe('petId');
  });

  it('describes scalar, repeated, optional and message fields', () => {
    const login = 'adopt_dont_shop.auth.v1.LoginRequest';
    expect(field(PROTO_SCHEMA, login, 'ip_address')).toMatchObject({
      kind: 'scalar',
      scalarType: 'string',
      optional: true,
      repeated: false,
    });
    expect(
      field(PROTO_SCHEMA, 'adopt_dont_shop.auth.v1.GetMeResponse', 'permissions')
    ).toMatchObject({ kind: 'scalar', scalarType: 'string', repeated: true });
    expect(field(PROTO_SCHEMA, `${PET}.GetPetResponse`, 'pet')).toMatchObject({
      kind: 'message',
      typeName: `${PET}.Pet`,
    });
  });

  it('includes enums with their values', () => {
    const status = PROTO_SCHEMA.enums[`${PET}.PetStatus`];

    expect(status?.values.length).toBeGreaterThan(1);
    expect(status?.values[0]).toEqual({ name: expect.stringMatching(/UNSPECIFIED$/), number: 0 });
  });

  it('gives every service method resolvable input and output messages', () => {
    const unresolved = Object.values(PROTO_SCHEMA.services).flatMap(service =>
      service.methods
        .flatMap(m => [m.inputType, m.outputType])
        .filter(type => PROTO_SCHEMA.messages[type] === undefined)
    );

    expect(unresolved).toEqual([]);
  });
});

// The committed protos have no map or nested-message fields, so the
// generator's handling of them is proven against a throwaway buf module.
describe('buildSchema on a fixture module', () => {
  const FIXTURE = `syntax = "proto3";
package adopt_dont_shop.fixture.v1;
import "proto/adopt_dont_shop/v1/options.proto";

// A fixture service.
service FixtureService {
  // Does a thing.
  rpc Do(Outer) returns (Outer.Inner);
}

// Outer doc.
message Outer {
  enum Mode { MODE_UNSPECIFIED = 0; MODE_FAST = 1; }
  message Inner {
    string inner_name = 1 [(adopt_dont_shop.v1.sensitivity) = SENSITIVITY_SPECIAL];
  }
  // Labels by key.
  map<string, string> label_map = 1 [(adopt_dont_shop.v1.sensitivity) = SENSITIVITY_PUBLIC];
  map<string, Inner> inner_by_key = 2;
  repeated Inner inners = 3;
  Mode mode = 4;
  optional int64 maybe_count = 5 [(adopt_dont_shop.v1.sensitivity) = SENSITIVITY_INTERNAL];
  string plain = 6;
  string home_address_line_1 = 7 [(adopt_dont_shop.v1.sensitivity) = SENSITIVITY_PII];
}
`;
  let dir: string;
  let schema: ProtoSchema;

  beforeAll(async () => {
    dir = mkdtempSync(join(tmpdir(), 'proto-schema-fixture-'));
    mkdirSync(join(dir, 'proto/adopt_dont_shop/v1'), { recursive: true });
    mkdirSync(join(dir, 'proto/adopt_dont_shop/fixture/v1'), { recursive: true });
    writeFileSync(join(dir, 'buf.yaml'), 'version: v1\n');
    cpSync(
      join(__dirname, '../proto/adopt_dont_shop/v1/options.proto'),
      join(dir, 'proto/adopt_dont_shop/v1/options.proto')
    );
    writeFileSync(join(dir, 'proto/adopt_dont_shop/fixture/v1/fixture.proto'), FIXTURE);
    // @ts-expect-error -- plain .mjs script without type declarations
    const generator = (await import('../scripts/generate-schema.mjs')) as {
      loadDescriptorSet: (moduleDir: string) => unknown;
      buildSchema: (set: unknown) => ProtoSchema;
    };
    schema = generator.buildSchema(generator.loadDescriptorSet(dir));
  });

  afterAll(() => rmSync(dir, { recursive: true, force: true }));

  const OUTER = 'adopt_dont_shop.fixture.v1.Outer';

  it('names nested messages and enums with their parent', () => {
    expect(Object.keys(schema.messages).sort()).toEqual([OUTER, `${OUTER}.Inner`]);
    expect(schema.enums[`${OUTER}.Mode`]?.values).toEqual([
      { name: 'MODE_UNSPECIFIED', number: 0 },
      { name: 'MODE_FAST', number: 1 },
    ]);
  });

  it('reads custom option values, including on nested messages', () => {
    expect(field(schema, `${OUTER}.Inner`, 'inner_name').sensitivity).toBe('SPECIAL');
    expect(field(schema, OUTER, 'home_address_line_1').sensitivity).toBe('PII');
    expect(field(schema, OUTER, 'maybe_count').sensitivity).toBe('INTERNAL');
    expect(field(schema, OUTER, 'plain').sensitivity).toBeNull();
  });

  it('describes map fields and resolves the value type', () => {
    expect(field(schema, OUTER, 'label_map')).toMatchObject({
      kind: 'map',
      repeated: false,
      sensitivity: 'PUBLIC',
      comment: 'Labels by key.',
    });
    expect(field(schema, OUTER, 'label_map').typeName).toBeUndefined();
    expect(field(schema, OUTER, 'inner_by_key')).toMatchObject({
      kind: 'map',
      typeName: `${OUTER}.Inner`,
    });
  });

  it('describes repeated message, enum and optional scalar fields', () => {
    expect(field(schema, OUTER, 'inners')).toMatchObject({
      kind: 'message',
      repeated: true,
      typeName: `${OUTER}.Inner`,
    });
    expect(field(schema, OUTER, 'mode')).toMatchObject({ kind: 'enum', typeName: `${OUTER}.Mode` });
    expect(field(schema, OUTER, 'maybe_count')).toMatchObject({
      scalarType: 'int64',
      optional: true,
      jsonName: 'maybeCount',
    });
  });

  it('resolves nested types on service methods', () => {
    expect(schema.services['adopt_dont_shop.fixture.v1.FixtureService']?.methods).toEqual([
      {
        name: 'Do',
        inputType: OUTER,
        outputType: `${OUTER}.Inner`,
        comment: 'Does a thing.',
      },
    ]);
  });

  it('does not emit synthetic map-entry messages', () => {
    expect(Object.keys(schema.messages).some(name => name.endsWith('Entry'))).toBe(false);
  });
});
