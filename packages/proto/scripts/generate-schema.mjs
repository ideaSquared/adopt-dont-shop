#!/usr/bin/env node
/**
 * Reflects every .proto under proto/ into `src/schema.generated.ts`
 * (`PROTO_SCHEMA`): messages with their fields, enums, and services with
 * their methods. service.ops uses it to mask PII fail-closed (driven by the
 * `(adopt_dont_shop.v1.sensitivity)` field option) and to serve the CLI
 * catalog.
 *
 * How: `buf build` produces a descriptor set (with source info, so leading
 * comments survive); the custom option is decoded through a registry built
 * from that same set, so no option number is hard-coded here.
 *
 * Output is deterministic (type maps are key-sorted, fields keep declaration
 * order) and prettier-formatted. `check-generated-fresh.mjs` re-runs this in
 * memory and fails CI when the committed file is stale.
 *
 * Run: `pnpm generate` (buf generate && this script).
 */
import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

import { createFileRegistry, fromBinary, getExtension, hasExtension } from '@bufbuild/protobuf';
import {
  FieldDescriptorProto_Label,
  FieldDescriptorProto_Type,
  FileDescriptorSetSchema,
} from '@bufbuild/protobuf/wkt';
import prettier from 'prettier';

const PKG_ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const OUTPUT_PATH = join(PKG_ROOT, 'src', 'schema.generated.ts');

const OWN_FILE_PREFIX = 'proto/adopt_dont_shop/';
const SENSITIVITY_OPTION = 'adopt_dont_shop.v1.sensitivity';
const SENSITIVITY_PREFIX = 'SENSITIVITY_';

// FileDescriptorProto field numbers used to build source-info paths.
const FILE_MESSAGES = 4;
const FILE_SERVICES = 6;
const MESSAGE_FIELDS = 2;
const MESSAGE_NESTED = 3;
const SERVICE_METHODS = 2;

const SCALAR_NAMES = new Map([
  [FieldDescriptorProto_Type.STRING, 'string'],
  [FieldDescriptorProto_Type.BYTES, 'bytes'],
  [FieldDescriptorProto_Type.BOOL, 'bool'],
  [FieldDescriptorProto_Type.INT32, 'int32'],
  [FieldDescriptorProto_Type.INT64, 'int64'],
  [FieldDescriptorProto_Type.UINT32, 'uint32'],
  [FieldDescriptorProto_Type.UINT64, 'uint64'],
  [FieldDescriptorProto_Type.SINT32, 'sint32'],
  [FieldDescriptorProto_Type.SINT64, 'sint64'],
  [FieldDescriptorProto_Type.FIXED32, 'fixed32'],
  [FieldDescriptorProto_Type.FIXED64, 'fixed64'],
  [FieldDescriptorProto_Type.SFIXED32, 'sfixed32'],
  [FieldDescriptorProto_Type.SFIXED64, 'sfixed64'],
  [FieldDescriptorProto_Type.DOUBLE, 'double'],
  [FieldDescriptorProto_Type.FLOAT, 'float'],
]);

// buf's launcher is a Node script. Run it with this Node instead of the
// node_modules/.bin shim, which is a shell script on Windows (spawn ENOENT).
const BUF_LAUNCHER = createRequire(import.meta.url).resolve('@bufbuild/buf/bin/buf');

const compact = entries => Object.fromEntries(entries.filter(([, value]) => value !== undefined));

const sortedByKey = record =>
  Object.fromEntries(Object.entries(record).sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0)));

const tidyComment = raw => {
  const text = (raw ?? '')
    .split('\n')
    .map(line => line.replace(/^ /, '').trimEnd())
    .join('\n')
    .trim();
  return text === '' ? undefined : text;
};

/** Reads the descriptor set that `buf build` produces for a buf module (default: this package). */
export const loadDescriptorSet = (moduleDir = PKG_ROOT) => {
  const dir = mkdtempSync(join(tmpdir(), 'proto-schema-'));
  try {
    const image = join(dir, 'image.binpb');
    execFileSync(process.execPath, [BUF_LAUNCHER, 'build', '-o', image], {
      cwd: moduleDir,
      stdio: 'inherit',
    });
    return fromBinary(FileDescriptorSetSchema, readFileSync(image));
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
};

/** Pure: descriptor set in, `ProtoSchema`-shaped object out. */
export const buildSchema = descriptorSet => {
  const registry = createFileRegistry(descriptorSet);
  const sensitivityOption = registry.getExtension(SENSITIVITY_OPTION);
  if (!sensitivityOption) {
    throw new Error(`Extension ${SENSITIVITY_OPTION} not found — is options.proto in the module?`);
  }
  const sensitivityEnum = sensitivityOption.enum;
  if (!sensitivityEnum) throw new Error(`${SENSITIVITY_OPTION} must be an enum extension`);

  const files = descriptorSet.file.filter(file => file.name.startsWith(OWN_FILE_PREFIX));

  const sensitivityOf = options => {
    if (!options || !hasExtension(options, sensitivityOption)) return null;
    const value = sensitivityEnum.values.find(
      v => v.number === getExtension(options, sensitivityOption)
    );
    if (!value || value.number === 0) return null;
    return value.name.startsWith(SENSITIVITY_PREFIX)
      ? value.name.slice(SENSITIVITY_PREFIX.length)
      : value.name;
  };

  // Index every message by its fully-qualified name so map fields can be
  // resolved to their value type.
  const messageIndex = new Map();
  const indexMessages = (messages, prefix) =>
    messages.forEach(message => {
      const fullName = `${prefix}.${message.name}`;
      messageIndex.set(fullName, message);
      indexMessages(message.nestedType, fullName);
    });
  files.forEach(file => indexMessages(file.messageType, file.package));

  const fieldSchema = (field, comment) => {
    const typeName = field.typeName ? field.typeName.replace(/^\./, '') : undefined;
    const repeated = field.label === FieldDescriptorProto_Label.REPEATED;
    const entry = repeated && typeName ? messageIndex.get(typeName) : undefined;
    const isMap = entry?.options?.mapEntry === true;
    const valueField = isMap ? entry.field.find(f => f.number === 2) : undefined;

    const describe = () => {
      if (isMap) {
        const valueType = valueField?.typeName?.replace(/^\./, '');
        const hasNamedValue =
          valueField?.type === FieldDescriptorProto_Type.MESSAGE ||
          valueField?.type === FieldDescriptorProto_Type.ENUM;
        return { kind: 'map', typeName: hasNamedValue ? valueType : undefined };
      }
      if (field.type === FieldDescriptorProto_Type.MESSAGE) return { kind: 'message', typeName };
      if (field.type === FieldDescriptorProto_Type.ENUM) return { kind: 'enum', typeName };
      return { kind: 'scalar', scalarType: SCALAR_NAMES.get(field.type) };
    };
    const { kind, scalarType, typeName: resolvedTypeName } = describe();

    return compact([
      ['name', field.name],
      ['jsonName', field.jsonName],
      ['kind', kind],
      ['scalarType', scalarType],
      ['typeName', resolvedTypeName],
      ['repeated', repeated && !isMap],
      ['optional', field.proto3Optional === true],
      ['sensitivity', sensitivityOf(field.options)],
      ['comment', comment],
    ]);
  };

  const messages = {};
  const enums = {};
  const services = {};

  const commentFor = (file, path) => {
    const key = path.join(',');
    const location = file.sourceCodeInfo?.location.find(loc => loc.path.join(',') === key);
    return tidyComment(location?.leadingComments);
  };

  const addEnum = (file, enumProto, fullName) => {
    enums[fullName] = {
      fullName,
      values: enumProto.value.map(v => ({ name: v.name, number: v.number })),
    };
  };

  const addMessage = (file, message, fullName, path) => {
    if (message.options?.mapEntry === true) return;
    messages[fullName] = {
      fullName,
      fields: message.field.map((field, index) =>
        fieldSchema(field, commentFor(file, [...path, MESSAGE_FIELDS, index]))
      ),
    };
    message.nestedType.forEach((nested, index) =>
      addMessage(file, nested, `${fullName}.${nested.name}`, [...path, MESSAGE_NESTED, index])
    );
    message.enumType.forEach(nested => addEnum(file, nested, `${fullName}.${nested.name}`));
  };

  files.forEach(file => {
    file.messageType.forEach((message, index) =>
      addMessage(file, message, `${file.package}.${message.name}`, [FILE_MESSAGES, index])
    );
    file.enumType.forEach(enumProto =>
      addEnum(file, enumProto, `${file.package}.${enumProto.name}`)
    );
    file.service.forEach((service, serviceIndex) => {
      const fullName = `${file.package}.${service.name}`;
      services[fullName] = {
        fullName,
        package: file.package,
        name: service.name,
        methods: service.method.map((method, methodIndex) =>
          compact([
            ['name', method.name],
            ['inputType', method.inputType.replace(/^\./, '')],
            ['outputType', method.outputType.replace(/^\./, '')],
            [
              'comment',
              commentFor(file, [FILE_SERVICES, serviceIndex, SERVICE_METHODS, methodIndex]),
            ],
          ])
        ),
      };
    });
  });

  return {
    messages: sortedByKey(messages),
    enums: sortedByKey(enums),
    services: sortedByKey(services),
  };
};

const HEADER = `// GENERATED by scripts/generate-schema.mjs from proto/**/*.proto — do not edit by hand.
// Regenerate with \`pnpm --filter @adopt-dont-shop/proto generate\`; CI fails when stale
// (scripts/check-generated-fresh.mjs).
//
// Reflection of every message, enum and service, including the
// \`(adopt_dont_shop.v1.sensitivity)\` field option (null = not annotated).
`;

/** Full, prettier-formatted source of `schema.generated.ts`. */
export const renderSchemaSource = async schema => {
  const body = `import type { ProtoSchema } from './schema-types.js';

export const PROTO_SCHEMA: ProtoSchema = ${JSON.stringify(schema)};
`;
  const config = (await prettier.resolveConfig(OUTPUT_PATH)) ?? {};
  return prettier.format(HEADER + body, { ...config, filepath: OUTPUT_PATH });
};

export const generateSchemaSource = async () =>
  renderSchemaSource(buildSchema(loadDescriptorSet()));

const isMain = process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;
if (isMain) {
  const source = await generateSchemaSource();
  writeFileSync(OUTPUT_PATH, source);
  console.log(`Wrote ${OUTPUT_PATH}`);
}
