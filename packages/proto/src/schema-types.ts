// Types for the generated proto schema map (`schema.generated.ts`).
//
// The map is a reflection of every .proto under proto/: messages with their
// fields (JSON names, types, sensitivity annotations), enums, and services
// with their methods. service.ops uses it to mask PII fail-closed and to
// serve the CLI catalog.

export type Sensitivity = 'PUBLIC' | 'INTERNAL' | 'PII' | 'SPECIAL';

export type ScalarType =
  | 'string'
  | 'bytes'
  | 'bool'
  | 'int32'
  | 'int64'
  | 'uint32'
  | 'uint64'
  | 'sint32'
  | 'sint64'
  | 'fixed32'
  | 'fixed64'
  | 'sfixed32'
  | 'sfixed64'
  | 'double'
  | 'float';

export type FieldSchema = {
  readonly name: string; // proto field name, snake_case
  readonly jsonName: string; // camelCase, as used by ts-proto fromJSON/toJSON
  readonly kind: 'scalar' | 'enum' | 'message' | 'map';
  readonly scalarType?: ScalarType; // kind === 'scalar'
  readonly typeName?: string; // fully-qualified; kind === 'enum' | 'message' (map: value message/enum, if any)
  readonly repeated: boolean;
  readonly optional: boolean;
  readonly sensitivity: Sensitivity | null; // null = not annotated
  readonly comment?: string; // leading comment, trimmed
};

export type MessageSchema = {
  readonly fullName: string; // e.g. 'adopt_dont_shop.pets.v1.Pet'
  readonly fields: readonly FieldSchema[];
};

export type EnumSchema = {
  readonly fullName: string;
  readonly values: readonly { readonly name: string; readonly number: number }[];
};

export type MethodSchema = {
  readonly name: string; // e.g. 'UpdateStatus'
  readonly inputType: string; // fully-qualified
  readonly outputType: string; // fully-qualified
  readonly comment?: string;
};

export type ServiceSchema = {
  readonly fullName: string; // e.g. 'adopt_dont_shop.pets.v1.PetService'
  readonly package: string; // e.g. 'adopt_dont_shop.pets.v1'
  readonly name: string; // e.g. 'PetService'
  readonly methods: readonly MethodSchema[];
};

export type ProtoSchema = {
  readonly messages: Readonly<Record<string, MessageSchema>>;
  readonly enums: Readonly<Record<string, EnumSchema>>;
  readonly services: Readonly<Record<string, ServiceSchema>>;
};
