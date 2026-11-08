import type { ParseArgsOptionsConfig } from 'node:util';
import type { CatalogField, CatalogMethod, ScalarType } from '@adopt-dont-shop/ops-contract';
import { GLOBAL_FLAG_NAMES, type ParsedArgs, type RawValue } from './args.js';
import { didYouMean, suggest, type CatalogIndex } from './catalog.js';
import { UsageError } from './errors.js';
import { enumPrefix } from './ui/format.js';

export type FieldType = 'string' | 'number' | 'integer' | 'boolean' | 'enum' | 'json';

export type FieldSpec = {
  readonly field: CatalogField;
  readonly key: string; // jsonName, used in the request
  readonly flag: string; // kebab-case, used on the command line
  readonly type: FieldType;
  readonly enumValues: readonly string[]; // full proto names
  readonly shortEnumValues: readonly string[];
};

export const kebab = (s: string): string => s.replace(/([a-z0-9])([A-Z])/g, '$1-$2').toLowerCase();

const INTEGER_TYPES: readonly ScalarType[] = [
  'int32',
  'int64',
  'uint32',
  'uint64',
  'sint32',
  'sint64',
  'fixed32',
  'fixed64',
  'sfixed32',
  'sfixed64',
];

const typeOf = (f: CatalogField): FieldType => {
  if (f.kind === 'message' || f.kind === 'map') {
    return 'json';
  }
  if (f.kind === 'enum') {
    return 'enum';
  }
  if (f.scalarType === 'bool') {
    return 'boolean';
  }
  if (f.scalarType && INTEGER_TYPES.includes(f.scalarType)) {
    return 'integer';
  }
  if (f.scalarType === 'double' || f.scalarType === 'float') {
    return 'number';
  }
  return 'string';
};

export const fieldSpecs = (index: CatalogIndex, method: CatalogMethod): readonly FieldSpec[] =>
  (index.message(method.inputType)?.fields ?? []).map(field => {
    const def = field.kind === 'enum' && field.typeName ? index.enumDef(field.typeName) : undefined;
    const names = def?.values.map(v => v.name) ?? [];
    const prefix = def ? enumPrefix(def.fullName, names) : '';
    return {
      field,
      key: field.jsonName,
      flag: kebab(field.jsonName),
      type: typeOf(field),
      enumValues: names,
      shortEnumValues: names.map(n => n.slice(prefix.length).toLowerCase() || n.toLowerCase()),
    };
  });

export const isIdLike = (spec: FieldSpec): boolean => spec.key === 'id' || /Id$/.test(spec.key);

// proto3 has no "required", so identifiers are treated as required.
export const isRequired = (spec: FieldSpec): boolean =>
  !spec.field.optional && !spec.field.repeated && isIdLike(spec);

// The field a bare positional argument fills.
export const positionalField = (specs: readonly FieldSpec[]): FieldSpec | undefined =>
  specs.find(isRequired) ??
  specs.find(s => isIdLike(s) && s.type === 'string') ??
  specs.find(s => s.type !== 'json');

export const orderForPrompting = (specs: readonly FieldSpec[]): readonly FieldSpec[] => [
  ...specs.filter(isRequired),
  ...specs.filter(s => !isRequired(s)),
];

// ---------------------------------------------------------------------------
// Option declarations for node:util parseArgs
// ---------------------------------------------------------------------------

export const optionsFor = (specs: readonly FieldSpec[]): ParseArgsOptionsConfig =>
  Object.fromEntries(
    specs
      .filter(s => s.type !== 'json' && !GLOBAL_FLAG_NAMES.includes(s.flag))
      .flatMap((s): [string, ParseArgsOptionsConfig[string]][] =>
        s.type === 'boolean' && !s.field.repeated
          ? [
              [s.flag, { type: 'boolean' }],
              [`no-${s.flag}`, { type: 'boolean' }],
            ]
          : [[s.flag, { type: 'string', multiple: true }]]
      )
  );

export const knownFlags = (specs: readonly FieldSpec[]): readonly string[] => [
  ...GLOBAL_FLAG_NAMES,
  ...Object.keys(optionsFor(specs)),
];

// ---------------------------------------------------------------------------
// Enum matching: `adopted` -> PET_STATUS_ADOPTED
// ---------------------------------------------------------------------------

export const resolveEnumValue = (spec: FieldSpec, input: string): string => {
  const wanted = input.trim().toUpperCase().replace(/-/g, '_');
  const exact = spec.enumValues.find(v => v === wanted);
  if (exact) {
    return exact;
  }
  // `available` must not collide with NOT_AVAILABLE, so short names win over suffixes.
  const byShortName = spec.enumValues.filter(
    (_, i) => spec.shortEnumValues[i]?.toUpperCase() === wanted
  );
  if (byShortName.length === 1 && byShortName[0]) {
    return byShortName[0];
  }
  const bySuffix = spec.enumValues.filter(v => v.endsWith(`_${wanted}`));
  if (bySuffix.length === 1 && bySuffix[0]) {
    return bySuffix[0];
  }
  const valid = spec.shortEnumValues.join(', ');
  if (bySuffix.length > 1) {
    throw new UsageError(
      `"${input}" is ambiguous for --${spec.flag}.`,
      `Use the full name. Valid: ${valid}.`
    );
  }
  const hint = didYouMean(input, spec.shortEnumValues);
  throw new UsageError(
    `"${input}" is not a valid value for --${spec.flag}.`,
    `${hint} Valid: ${valid}.`.trim()
  );
};

// ---------------------------------------------------------------------------
// Converting flag values
// ---------------------------------------------------------------------------

const convertNumber = (spec: FieldSpec, raw: string): number => {
  const n = Number(raw);
  const valid =
    raw.trim() !== '' && Number.isFinite(n) && (spec.type === 'number' || Number.isInteger(n));
  if (valid) {
    return n;
  }
  const kind = spec.type === 'integer' ? 'a whole number' : 'a number';
  throw new UsageError(`--${spec.flag} expects ${kind}, got "${raw}".`);
};

export const convertScalar = (spec: FieldSpec, raw: string): unknown => {
  if (spec.type === 'number' || spec.type === 'integer') {
    return convertNumber(spec, raw);
  }
  if (spec.type === 'enum') {
    return resolveEnumValue(spec, raw);
  }
  if (spec.type === 'boolean') {
    return parseBool(spec, raw);
  }
  return raw;
};

const parseBool = (spec: FieldSpec, raw: string): boolean => {
  if (['true', 'yes', '1'].includes(raw.toLowerCase())) {
    return true;
  }
  if (['false', 'no', '0'].includes(raw.toLowerCase())) {
    return false;
  }
  throw new UsageError(`--${spec.flag} expects true or false, got "${raw}".`);
};

const asList = (v: RawValue): readonly (string | boolean)[] =>
  v === undefined ? [] : Array.isArray(v) ? v : [v as string | boolean];

const fromFlag = (spec: FieldSpec, values: ParsedArgs['values']): unknown => {
  if (spec.type === 'json') {
    return undefined;
  }
  if (spec.type === 'boolean' && !spec.field.repeated) {
    const on = values[spec.flag];
    const off = values[`no-${spec.flag}`] === true;
    if (on !== undefined && off) {
      throw new UsageError(`Use either --${spec.flag} or --no-${spec.flag}, not both.`);
    }
    if (off) {
      return false;
    }
    if (on === undefined) {
      return undefined;
    }
    return typeof on === 'string' ? parseBool(spec, on) : true;
  }
  const items = asList(values[spec.flag]);
  if (items.length === 0) {
    return undefined;
  }
  const strings = items.map(i => {
    if (typeof i === 'string') {
      return i;
    }
    throw new UsageError(`--${spec.flag} needs a value.`);
  });
  if (!spec.field.repeated) {
    return convertScalar(spec, strings[strings.length - 1] ?? '');
  }
  return strings
    .flatMap(s => s.split(','))
    .map(s => s.trim())
    .filter(s => s !== '')
    .map(s => convertScalar(spec, s));
};

const parseJsonObject = (text: string | undefined): Record<string, unknown> => {
  if (text === undefined) {
    return {};
  }
  try {
    const parsed: unknown = JSON.parse(text);
    if (typeof parsed === 'object' && parsed !== null && !Array.isArray(parsed)) {
      return parsed as Record<string, unknown>; // checked to be a plain object just above
    }
  } catch {
    // fall through to the usage error below
  }
  throw new UsageError('--json must be a JSON object, e.g. --json \'{"petId":"..."}\'.');
};

// Flags the person used that we do not recognise, with a suggestion if close.
export const findUnknownFlags = (
  values: ParsedArgs['values'],
  specs: readonly FieldSpec[]
): readonly string[] => {
  const known = knownFlags(specs);
  const nested = specs.filter(s => s.type === 'json').map(s => s.flag);
  return Object.keys(values).flatMap(name => {
    if (known.includes(name)) {
      return [];
    }
    if (nested.includes(name)) {
      throw new UsageError(
        `--${name} is a nested field and can only be set with --json.`,
        `Example: --json '{"${specs.find(s => s.flag === name)?.key}": {...}}'`
      );
    }
    const candidate = suggest(
      name,
      known.filter(k => !k.startsWith('no-'))
    );
    throw new UsageError(
      `Unknown flag --${name}.`,
      candidate
        ? `Did you mean \`--${candidate}\`?`
        : 'Run the command with --help to see its flags.'
    );
  });
};

export type BuiltRequest = Record<string, unknown>;

export const buildRequest = (input: {
  readonly specs: readonly FieldSpec[];
  readonly parsed: ParsedArgs;
  readonly positionals: readonly string[];
  readonly json?: string;
}): BuiltRequest => {
  const { specs, parsed, positionals } = input;
  findUnknownFlags(parsed.values, specs);
  if (positionals.length > 1) {
    throw new UsageError(
      `Unexpected extra argument "${positionals[1]}".`,
      'Use --flags for the other fields.'
    );
  }
  const base = parseJsonObject(input.json);
  const target = positionalField(specs);
  const positional = positionals[0];
  if (positional !== undefined && !target) {
    throw new UsageError(`This command takes no positional argument ("${positional}").`);
  }
  const fromPositional =
    positional !== undefined && target && typeof parsed.values[target.flag] === 'undefined'
      ? {
          [target.key]: target.field.repeated
            ? positional.split(',').map(s => convertScalar(target, s.trim()))
            : convertScalar(target, positional),
        }
      : {};
  const fromFlags = Object.fromEntries(
    specs.map(s => [s.key, fromFlag(s, parsed.values)] as const).filter(([, v]) => v !== undefined)
  );
  return { ...base, ...fromPositional, ...fromFlags };
};

const quote = (s: string): string =>
  /^[\w./:@,+-]+$/.test(s) ? s : `'${s.replace(/'/g, `'\\''`)}'`;

// Argv tokens (after `pnpm ops`) that reproduce a request.
export const commandArgv = (
  service: string,
  method: CatalogMethod,
  specs: readonly FieldSpec[],
  request: BuiltRequest
): readonly string[] => {
  const target = positionalField(specs);
  const shortFor = (spec: FieldSpec, v: unknown): string => {
    if (spec.type !== 'enum' || typeof v !== 'string') {
      return String(v);
    }
    return spec.shortEnumValues[spec.enumValues.indexOf(v)] ?? v;
  };
  const known = specs.filter(s => s.key in request);
  const flagParts = known
    .filter(s => s !== target && s.type !== 'json')
    .flatMap(s => {
      const v = request[s.key];
      if (s.type === 'boolean' && typeof v === 'boolean') {
        return [v ? `--${s.flag}` : `--no-${s.flag}`];
      }
      const text = Array.isArray(v) ? v.map(x => shortFor(s, x)).join(',') : shortFor(s, v);
      return [`--${s.flag}`, text];
    });
  const nested = Object.fromEntries(
    known.filter(s => s.type === 'json').map(s => [s.key, request[s.key]])
  );
  const positional = target && target.key in request ? [shortFor(target, request[target.key])] : [];
  const jsonPart = Object.keys(nested).length > 0 ? ['--json', JSON.stringify(nested)] : [];
  return [service, method.command, ...positional, ...flagParts, ...jsonPart];
};

// The equivalent command line, shown after interactive mode so people learn it.
export const formatCommandLine = (
  service: string,
  method: CatalogMethod,
  specs: readonly FieldSpec[],
  request: BuiltRequest
): string => ['pnpm ops', ...commandArgv(service, method, specs, request).map(quote)].join(' ');
